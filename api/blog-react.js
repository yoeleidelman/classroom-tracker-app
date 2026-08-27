// api/blog-react.js
// Handles several related, small server-side actions from one endpoint — reacting to a blog post,
// marking a post as read, backfilling likely blog reads from before per-post tracking existed, and
// (despite the file's own name, kept for the sake of not renaming it and touching every existing
// caller) backfilling a single message thread's own read status the same way. All merged together
// specifically to stay within Vercel's Hobby-plan limit of 12 serverless functions per deployment —
// each began life as its own idea, but all share nearly identical server-side identity logic, and
// combining them freed up the function slots a Hobby-plan deployment actually had left. Which
// behavior a request wants is chosen by its own explicit "action" field, never inferred from which
// other fields happen to be present.
//
// These exist server-side for the same underlying reason: Firestore rules cannot express "you may
// only modify your own entry inside a nested array or a shared document," whether that's a blog
// post's reactions, its readers, or a message thread's own read status. A client-side rule can
// only validate things like "the overall array length doesn't change," which is real protection,
// but leaves a real gap underneath it: a signed-in family or teacher could, via a direct write
// bypassing the app's own UI, spoof any OTHER person's name and id onto a reaction or a read
// record, as long as the shape of the change looked plausible.
//
// The fix is to never let the client supply who's acting at all. This endpoint reads the caller's
// OWN identity from their own account record — a family's stored name and shared familyGroupId, or
// a teacher's stored name and uid — using the same server-verified auth token every other secured
// endpoint in this app relies on. The request body only ever carries WHAT action to take and WHERE
// (which post, optionally which block, optionally which specific photo within it, or which message
// thread), never WHO is acting.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const BLOG_REACTION_KEYS = ["heart", "smile", "thumbsup", "clap", "laugh", "wow", "pray"];

// Same single-choice toggle logic as computeSingleChoiceReactions on the client — kept in sync by
// hand since this runs in a separate execution environment; picking a new reaction replaces
// whichever one this reactor already had, picking the same one again removes it.
function computeSingleChoiceReactions(existingReactions, emoji, reactorId, reactorName) {
  const reactions = {};
  Object.entries(existingReactions || {}).forEach(([key, entries]) => {
    reactions[key] = (entries || []).filter((entry) => (typeof entry === "string" ? entry : entry?.id) !== reactorId);
  });
  const alreadyHadThisOne = (existingReactions?.[emoji] || []).some((entry) => (typeof entry === "string" ? entry : entry?.id) === reactorId);
  if (!alreadyHadThisOne) reactions[emoji] = [...(reactions[emoji] || []), { id: reactorId, name: reactorName }];
  return reactions;
}

async function requireIdentityAndClassAccess(req, classId, actingAs) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw { status: 401, message: "Sign-in required." };

  const auth = getAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw { status: 401, message: "Sign-in session is invalid or expired." };
  }

  const db = getFirestore();
  const [teacherDoc, familyDoc] = await Promise.all([
    db.collection("data").doc(`teacher:${decoded.uid}`).get(),
    db.collection("data").doc(`family:${decoded.uid}`).get(),
  ]);
  const teacher = teacherDoc.exists ? teacherDoc.data().value : null;
  const family = familyDoc.exists ? familyDoc.data().value : null;

  // Returns null only when this role genuinely doesn't exist or is inactive for this account —
  // that's "try the other role." A record that DOES exist but lacks access to this specific class
  // throws immediately instead, since that's a real, definitive rejection for the role actually
  // being asked about, not a reason to go check whether some other, unrelated role might work.
  const asTeacher = () => {
    if (!teacher || teacher.active === false) return null;
    const isAdmin = teacher.role === "admin";
    const hasAccess = isAdmin || (teacher.assignedClassIds || []).includes(classId);
    if (!hasAccess) throw { status: 403, message: "You don't have access to this class." };
    return { actorId: decoded.uid, individualActorId: decoded.uid, actorName: teacher.name || "Teacher" };
  };
  const asFamily = () => {
    if (!family || family.active === false) return null;
    if (!(family.linkedClassIds || []).includes(classId)) throw { status: 403, message: "You don't have access to this class." };
    // actorId stays shared across every guardian in the household — read receipts and unread
    // counts are meant to be one shared, family-level fact, the same as messages already treat
    // it: if either parent has seen it, the family has seen it. individualActorId exists
    // specifically for reactions, where the opposite is true — see handleReact's own reasoning
    // for why a reaction needs each guardian kept genuinely separate instead.
    return { actorId: family.familyGroupId || family.uid, individualActorId: family.uid, actorName: family.name || "Family" };
  };

  // A single login can genuinely hold both roles at once — a teacher previewing their own class's
  // blog exactly as a parent would see it, using the app's own "Switch to Parent view," is a real,
  // supported case, not an edge case. Without knowing which experience actually made this request,
  // checking teacher first whenever both existed meant every action a dual-role account took while
  // genuinely using the family-facing side of the app got silently mislabeled as the teacher's own
  // — the identity WAS technically real and did have access, so nothing ever errored, it just
  // recorded the wrong one, every time. actingAs trusts what the caller already knows about
  // itself, falling back to whichever role genuinely exists only when the caller hasn't said —
  // every request already in production, from before this field existed, has no such value.
  if (actingAs === "family") { const r = asFamily(); if (r) return r; }
  if (actingAs === "teacher") { const r = asTeacher(); if (r) return r; }
  const teacherResult = asTeacher();
  if (teacherResult) return teacherResult;
  const familyResult = asFamily();
  if (familyResult) return familyResult;
  throw { status: 403, message: "Account not recognized." };
}

async function handleReact(req, res, classId, postId, actorId, actorName) {
  const { blockId, mediaIndex, emoji } = req.body || {};
  if (!emoji) return res.status(400).json({ error: "emoji is required for a reaction." });
  if (!BLOG_REACTION_KEYS.includes(emoji)) return res.status(400).json({ error: "Not a recognized reaction." });

  const db = getFirestore();
  const ref = db.collection("data").doc(`class:${classId}:blogPosts`);
  // Runs as an atomic transaction rather than a plain read-then-write — without this, two people
  // reacting to the same post within the same moment could race: both read the same starting
  // array, both compute their own change against it, and whichever write lands second silently
  // overwrites the first, losing that reaction. A transaction guarantees the read and the write
  // happen as one atomic step, so a concurrent second reaction is guaranteed to be computed
  // against the first one's result, not against stale data.
  const nextPosts = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const posts = snap.exists ? snap.data().value || [] : [];
    const post = posts.find((p) => p.id === postId);
    if (!post) throw { status: 404, message: "Post not found." };

    let updated;
    if (blockId) {
      const nextBlocks = post.blocks.map((b) => {
        if (b.id !== blockId) return b;
        // A reaction targets one specific photo/video within this block only when the block
        // actually has more than one — for a single-media block, "the photo" and "the block"
        // are the exact same thing, so this stays exactly as it always has: one reactions
        // object on the block itself, not a second, redundant copy one level down.
        const media = b.media || [];
        if (typeof mediaIndex === "number" && media.length > 1 && media[mediaIndex]) {
          const nextMedia = media.map((m, i) => (i === mediaIndex
            ? { ...m, reactions: computeSingleChoiceReactions(m.reactions, emoji, actorId, actorName) }
            : m));
          return { ...b, media: nextMedia };
        }
        return { ...b, reactions: computeSingleChoiceReactions(b.reactions, emoji, actorId, actorName) };
      });
      updated = posts.map((p) => (p.id === postId ? { ...p, blocks: nextBlocks } : p));
    } else {
      const reactions = computeSingleChoiceReactions(post.reactions, emoji, actorId, actorName);
      updated = posts.map((p) => (p.id === postId ? { ...p, reactions } : p));
    }
    tx.set(ref, { value: updated });
    return updated;
  });

  return res.status(200).json({ ok: true, posts: nextPosts });
}

async function handleMarkRead(req, res, classId, postId, actorId, actorName, collection) {
  const db = getFirestore();
  const ref = db.collection("data").doc(`class:${classId}:${collection}`);
  // Same atomic-transaction reasoning as handleReact above — two people opening the same post
  // within the same moment shouldn't be able to race and lose one of their read records to the
  // other's write landing second.
  const nextPosts = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const posts = snap.exists ? snap.data().value || [] : [];
    const post = posts.find((p) => p.id === postId);
    if (!post) throw { status: 404, message: "Post not found." };

    const existingReadBy = post.readBy || [];
    // Idempotent on purpose — a parent opening the tab marks every currently-loaded post read
    // every time, including ones they've already read before, so this has to be cheap and safe to
    // call repeatedly without growing the list or writing anything when nothing's actually new.
    if (existingReadBy.some((r) => r.id === actorId)) return posts;

    const nextReadBy = [...existingReadBy, { id: actorId, name: actorName, readAt: new Date().toISOString() }];
    const updated = posts.map((p) => (p.id === postId ? { ...p, readBy: nextReadBy } : p));
    tx.set(ref, { value: updated });
    return updated;
  });

  return res.status(200).json({ ok: true, posts: nextPosts });
}

// Fills in likely reads for a post from BEFORE this app tracked reads per-post at all — using
// the older, class-level "last time this family opened the Blog tab" timestamp that was already
// being recorded well before that. If a family's own last-opened moment for this class falls at
// or after this specific post's own timestamp, it's a reasonable sign they were around to see
// it — not a certainty the way a genuine, timed read is, which is exactly why every entry this
// adds is marked inferred: true rather than folded in as an indistinguishable, ordinary read.
// Runs once per post, ever — post.backfilled marks that this already happened, so opening the
// Blog tab a second time doesn't repeat the same class-wide scan for every post again.
async function handleBackfillReads(req, res, classId, postId) {
  const db = getFirestore();
  const ref = db.collection("data").doc(`class:${classId}:blogPosts`);
  const snap = await ref.get();
  const posts = snap.exists ? snap.data().value || [] : [];
  const post = posts.find((p) => p.id === postId);
  if (!post) return res.status(404).json({ error: "Post not found." });
  if (post.backfilled) return res.status(200).json({ ok: true, posts });

  // Same prefix-range family lookup api/class-families.js already uses to find every family
  // actually linked to this class — checking studentLinks directly as the authoritative source,
  // not just the derived linkedClassIds shortcut, for the same reason that file does: the
  // shortcut only ever gets populated the first time that specific guardian signs back in after
  // it was added, so relying on it alone can miss a real family that just hasn't happened to sign
  // in again yet.
  const familiesSnap = await db.collection("data")
    .orderBy(FieldPath.documentId())
    .startAt("family:")
    .endAt("family:\uf8ff")
    .get();
  const linkedFamilies = [];
  familiesSnap.forEach((doc) => {
    const f = doc.data().value;
    if (!f) return;
    const viaLinkedClassIds = Array.isArray(f.linkedClassIds) && f.linkedClassIds.includes(classId);
    const viaStudentLinks = Array.isArray(f.studentLinks) && f.studentLinks.some((l) => l?.classId === classId);
    if (viaLinkedClassIds || viaStudentLinks) linkedFamilies.push(f);
  });

  const postTime = new Date(post.timestamp);
  const existingReadBy = post.readBy || [];
  const alreadyRecorded = new Set(existingReadBy.map((r) => r.id));
  const inferredEntries = [];
  for (const f of linkedFamilies) {
    const groupId = f.familyGroupId || f.uid;
    if (alreadyRecorded.has(groupId)) continue; // eslint-disable-line no-continue
    const stateDoc = await db.collection("data").doc(`read-state:${f.uid}`).get(); // eslint-disable-line no-await-in-loop
    const state = stateDoc.exists ? stateDoc.data().value || {} : {};
    const lastOpened = state[`blog-${classId}`];
    if (lastOpened && new Date(lastOpened) >= postTime) {
      inferredEntries.push({ id: groupId, name: f.name || "Family", inferred: true });
      alreadyRecorded.add(groupId);
    }
  }

  const nextReadBy = [...existingReadBy, ...inferredEntries];
  const updated = posts.map((p) => (p.id === postId ? { ...p, readBy: nextReadBy, backfilled: true } : p));
  await ref.set({ value: updated });
  return res.status(200).json({ ok: true, posts: updated });
}

// Same reasoning as handleBackfillReads above, applied to one specific message thread instead of
// a whole class's worth of blog readers — a message thread only ever has one other party on it
// to begin with, so this never needs to scan every family the way the blog version does, only
// check the one family this exact thread already belongs to. Triggered by the TEACHER's own
// viewing rather than waiting on the family to reopen a thread they may have no real reason to
// revisit, the same practical gap the blog version's own automatic, viewer-triggered backfill
// was built to close.
async function handleBackfillMessageRead(req, res, storageKey, familyUid, readStateKey) {
  const db = getFirestore();
  const threadRef = db.collection("data").doc(storageKey);
  const threadSnap = await threadRef.get();
  const thread = threadSnap.exists ? threadSnap.data().value : null;
  if (!thread) return res.status(404).json({ error: "Thread not found." });
  if (thread.lastReadByFamily) return res.status(200).json({ ok: true }); // already has a real value — nothing to backfill

  const stateDoc = await db.collection("data").doc(`read-state:${familyUid}`).get();
  const state = stateDoc.exists ? stateDoc.data().value || {} : {};
  const lastRead = state[readStateKey];
  if (!lastRead) return res.status(200).json({ ok: true, backfilled: false }); // nothing to backfill from — this family never actually read this thread

  await threadRef.set({ value: { ...thread, lastReadByFamily: lastRead } });
  return res.status(200).json({ ok: true, backfilled: true });
}

// Ported from the client's own computeToggledCheckIn — same reasoning as computeSingleChoiceReactions
// just above for why this is a hand-kept copy rather than a shared import: this runs in a
// completely separate execution environment from the app itself. Needs to match the client's own
// version exactly, including the actionId idempotency guard — this is the one thing that makes it
// genuinely safe for the client's own retry and this server-side fallback to both be trying to
// complete the exact same tap at once, without one of them undoing what the other already did.
function computeToggledCheckInServerSide(existingCheckIns, date, byLabel, explicitTime, actionId, schoolEndTime) {
  const list = existingCheckIns || [];
  if (actionId && list.some((c) => c.actionId === actionId || c.checkOutActionId === actionId)) {
    return { checkIns: list, action: "already-done" };
  }
  const todaysEntries = list.filter((c) => c.date === date);
  const openEntry = todaysEntries.find((c) => c.checkInTime && !c.checkOutTime);
  const nowTime = explicitTime || new Date().toTimeString().slice(0, 5);
  if (openEntry) {
    const updated = list.map((c) => (c.id === openEntry.id ? { ...c, checkOutTime: nowTime, checkOutBy: byLabel, checkOutActionId: actionId } : c));
    return { checkIns: updated, action: "checked-out", entry: { ...openEntry, checkOutTime: nowTime, checkOutBy: byLabel } };
  }
  // The same hard, no-exceptions rule as the client's own toggle — a genuinely new check-in never
  // allowed once school has ended, kept in sync here on purpose since this fallback path is a
  // completely separate copy of the same logic, not a call into the client's own version of it.
  if (schoolEndTime && nowTime >= schoolEndTime) {
    return { checkIns: list, action: "blocked-school-ended" };
  }
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, checkInTime: nowTime, checkInBy: byLabel, checkOutTime: null, checkOutBy: null, actionId };
  return { checkIns: [...list, entry], action: "checked-in", entry };
}

// The genuinely new piece: when a parent's own device has been trying, and retrying, to complete
// a check-in or check-out for a real while and it still hasn't gone through, this is the backup
// path — reported live, directly, as a real gap worth closing: a phone with a perfectly good,
// general internet connection (every other app and every text message working fine) can still
// have trouble specifically with this app's own, separate, persistent connection to its database.
// A plain, one-shot request like this one doesn't depend on that same connection being healthy —
// it only needs to get out once, which a working phone very likely still can, even while whatever
// is specifically wrong with the other connection continues. Deliberately scoped to a parent's own
// check-in for now, not a teacher's — this is the one, specific, reported case this exists for.
// Never trusts anything the client claims about which classes this student is actually enrolled
// in or linked to — independently re-derives that from this account's own real, stored record,
// the same as every other identity check in this file already does, specifically so a spoofed
// request can't claim access to a student this account was never actually linked to.
async function handleFallbackCheckIn(req, res, decoded) {
  const { studentId, actionId, atDate, atTime } = req.body || {};
  if (!studentId || !actionId || !atDate || !atTime) {
    return res.status(400).json({ error: "studentId, actionId, atDate, and atTime are required." });
  }

  const db = getFirestore();
  const familyDoc = await db.collection("data").doc(`family:${decoded.uid}`).get();
  const family = familyDoc.exists ? familyDoc.data().value : null;
  if (!family || family.active === false) return res.status(403).json({ error: "Account not recognized." });

  const classLinks = (family.studentLinks || []).filter((l) => l.studentId === studentId);
  if (classLinks.length === 0) return res.status(403).json({ error: "Not linked to this student." });

  const byLabel = `Parent: ${family.name || "Family"}`;
  const refs = classLinks.map((l) => db.collection("data").doc(`class:${l.classId}:kriya:${studentId}`));

  // A transaction here for the same reason every other write in this file already uses one where
  // it matters: this student's real, current data has to be read and written as one atomic step,
  // never as two separate calls with a gap in between something else could land in.
  const result = await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const dataByClassId = {};
    classLinks.forEach((l, i) => { dataByClassId[l.classId] = snaps[i].exists ? snaps[i].data().value : null; });

    // The same "whichever class is actually open, if any" reasoning the client's own toggle
    // already uses — checked here across every class this account's own record actually links
    // this student to, not whatever the client might have claimed.
    let openClassId = null;
    for (const l of classLinks) {
      const checkIns = dataByClassId[l.classId]?.checkIns || [];
      if (checkIns.some((c) => c.date === atDate && c.checkInTime && !c.checkOutTime)) { openClassId = l.classId; break; }
    }
    const targetClassId = openClassId || classLinks[0].classId;
    const targetData = dataByClassId[targetClassId] || { checkIns: [] };
    // A genuinely school-wide setting, not part of any one class's own config — the same shared
    // "schoolSettings" document the client's own settings screen reads and writes.
    const schoolSettingsSnap = await tx.get(db.collection("data").doc("schoolSettings"));
    const schoolSettings = schoolSettingsSnap.exists ? schoolSettingsSnap.data().value : {};
    const toggled = computeToggledCheckInServerSide(targetData.checkIns, atDate, byLabel, atTime, actionId, schoolSettings?.checkInOut?.schoolEndTime);
    // A blocked attempt writes nothing — the family's already-real, already-recorded state stands.
    if (toggled.action === "blocked-school-ended") return { ...toggled, classId: targetClassId };
    tx.set(refs[classLinks.findIndex((l) => l.classId === targetClassId)], { ...targetData, checkIns: toggled.checkIns });
    return { ...toggled, classId: targetClassId };
  });

  // Best-effort, quiet notice to the class's own teachers that this happened through the backup
  // path — not urgent, not shown to the family at all, just visibility for whoever's actually in
  // the room in case they want to double check anything. Calls the messaging SDK directly rather
  // than going through send-push.js's own HTTP endpoint — that endpoint requires a real, signed-in
  // user's own auth token, which a server-to-server call like this one has no such thing to
  // provide; this is the same underlying send, just made directly from inside this same function.
  if (result.action !== "already-done" && result.action !== "blocked-school-ended") {
    try {
      const classRosterDoc = await db.collection("data").doc(`class:${result.classId}:roster`).get();
      const teachersSnap = await db.collection("data")
        .where(FieldPath.documentId(), ">=", "teacher:").where(FieldPath.documentId(), "<", "teacher;").get();
      const relevantTeacherUids = [];
      teachersSnap.forEach((doc) => {
        const t = doc.data().value;
        if (t?.active !== false && ((t.assignedClassIds || []).includes(result.classId) || t.role === "admin")) {
          relevantTeacherUids.push(doc.id.replace("teacher:", ""));
        }
      });
      if (relevantTeacherUids.length > 0) {
        const tokenDocs = await Promise.all(relevantTeacherUids.map((uid) => db.collection("data").doc(`push-tokens:${uid}`).get()));
        const allTokens = [];
        tokenDocs.forEach((doc) => { (doc.exists ? doc.data().value?.tokens || [] : []).forEach((t) => allTokens.push(t.token)); });
        if (allTokens.length > 0) {
          const studentName = (classRosterDoc.exists ? classRosterDoc.data().value : []).find((s) => s.id === studentId)?.name || "A student";
          const title = result.action === "checked-in" ? `${studentName} checked in` : `${studentName} checked out`;
          const body = "Completed automatically after a connection issue on the family's device.";
          await getMessaging().sendEachForMulticast({
            tokens: allTokens,
            data: { title, body, url: "/", icon: "/icons-teacher/icon-192.png" },
            webpush: { headers: { Urgency: "high" } },
          });
        }
      }
    } catch {
      // Never lets a notification failure undo or fail the actual check-in/out above — the real
      // action already succeeded by this point regardless of whether anyone gets told about it.
    }
  }

  return res.status(200).json({ ok: true, ...result });
}

// Runs on GitHub Actions' own schedule, roughly every 5 minutes, completely independent of
// Vercel's own cron (whose Hobby-plan limit — once a day, imprecise within the hour — is the
// exact gap this exists to close). Authenticated by a shared secret rather than a signed-in
// user's own token, since nobody is actually signed in when this runs — a scheduled job, not a
// person. Finds every scheduled item whose time has come, delivers it through the same storage
// shape the client already prepared it in, and marks it done — a failure on one item is recorded
// and skipped, never allowed to block every other item due in the same run.
async function handleProcessScheduledSends(req, res) {
  // Trimmed on both sides before comparing — a secret pasted from a code block (in a chat, a
  // doc, anywhere) can carry an invisible trailing newline that survives copy-paste completely
  // undetected, and GitHub's own secret storage doesn't strip it either. Two values that look
  // completely identical to a person checking them by eye can still fail a strict, untrimmed
  // comparison for exactly that reason — reported live as precisely this: re-copied, re-pasted,
  // re-checked, still failing. Trimming whitespace off both sides here doesn't weaken the secret
  // itself in any real sense; it just stops an invisible, accidental character from being able to
  // break the match at all.
  const providedSecret = (req.headers["x-scheduled-send-secret"] || "").trim();
  const expectedSecret = (process.env.SCHEDULED_SEND_SECRET || "").trim();
  if (!providedSecret || !expectedSecret || providedSecret !== expectedSecret) {
    // Lengths only, never the actual values — enough to tell a genuine mismatch apart from the
    // Vercel variable simply not being set at all, without ever exposing either real secret.
    return res.status(401).json({
      error: "Not authorized.",
      debug: { providedLength: providedSecret.length, expectedLength: expectedSecret.length, vercelVariableIsSet: Boolean(process.env.SCHEDULED_SEND_SECRET) },
    });
  }

  const db = getFirestore();
  const nowIso = new Date().toISOString();
  const snap = await db.collection("data")
    .orderBy(FieldPath.documentId())
    .startAt("scheduledSend:")
    .endAt("scheduledSend:\uf8ff")
    .get();

  const due = [];
  snap.forEach((doc) => {
    const value = doc.data().value;
    if (value && value.status === "pending" && value.scheduledFor <= nowIso) due.push({ key: doc.id, value });
  });

  let sent = 0;
  let failed = 0;
  for (const { key, value } of due) {
    try {
      if (value.kind === "blogPost") {
        const blogKey = `class:${value.classId}:blogPosts`;
        const blogDoc = await db.collection("data").doc(blogKey).get();
        const existingPosts = blogDoc.exists ? blogDoc.data().value || [] : [];
        await db.collection("data").doc(blogKey).set({ value: [...existingPosts, value.payload.entry] });

        // Same family-lookup logic as api/class-families.js — reading studentLinks directly as
        // the authoritative source, the same real, reported gap that endpoint itself was fixed
        // for: a guardian whose linkedClassIds hadn't backfilled yet would otherwise be invisible
        // to this query and silently never notified.
        const familiesSnap = await db.collection("data").orderBy(FieldPath.documentId()).startAt("family:").endAt("family:\uf8ff").get();
        const rosterDoc = await db.collection("data").doc(`class:${value.classId}:roster`).get();
        const roster = rosterDoc.exists ? rosterDoc.data().value || [] : [];
        const fullTimeIds = new Set(roster.filter((s) => !s.enrollmentScope || s.enrollmentScope === "full-time").map((s) => s.id));
        const uids = [];
        familiesSnap.forEach((doc) => {
          const f = doc.data().value;
          if (!f) return;
          const linked = Array.isArray(f.studentLinks) && f.studentLinks.some((l) => l?.classId === value.classId && fullTimeIds.has(l.studentId));
          if (linked) uids.push(f.uid);
        });
        if (uids.length > 0) {
          const tokenDocs = await Promise.all(uids.map((uid) => db.collection("data").doc(`push-tokens:${uid}`).get()));
          const allTokens = [];
          tokenDocs.forEach((doc) => { (doc.exists ? doc.data().value?.tokens || [] : []).forEach((t) => allTokens.push(t.token)); });
          if (allTokens.length > 0) {
            await getMessaging().sendEachForMulticast({
              tokens: allTokens,
              data: { title: value.payload.notifyTitle, body: value.payload.notifyBody, url: `/?portal=parent&open=blog&classId=${value.classId}`, icon: "/icons-parent/icon-192.png" },
              webpush: { headers: { Urgency: "high" } },
            });
          }
        }
      } else if (value.kind === "message") {
        const msgDoc = await db.collection("data").doc(value.payload.storageKey).get();
        const existingThread = msgDoc.exists ? msgDoc.data().value || { messages: [] } : { messages: [] };
        await db.collection("data").doc(value.payload.storageKey).set({ value: { messages: [...(existingThread.messages || []), value.payload.entry] } });

        const notifyUids = value.payload.notifyUids || [];
        if (notifyUids.length > 0) {
          const tokenDocs = await Promise.all(notifyUids.map((uid) => db.collection("data").doc(`push-tokens:${uid}`).get()));
          const allTokens = [];
          tokenDocs.forEach((doc) => { (doc.exists ? doc.data().value?.tokens || [] : []).forEach((t) => allTokens.push(t.token)); });
          if (allTokens.length > 0) {
            await getMessaging().sendEachForMulticast({
              tokens: allTokens,
              data: { title: value.payload.notifyTitle, body: value.payload.notifyBody, url: value.payload.notifyUrl || "/", icon: "/icons-parent/icon-192.png" },
              webpush: { headers: { Urgency: "high" } },
            });
          }
        }
      }
      await db.collection("data").doc(key).set({ value: { ...value, status: "sent", sentAt: new Date().toISOString() } });
      sent++;
    } catch (err) {
      console.error("Failed to process scheduled send", key, err);
      try {
        await db.collection("data").doc(key).set({ value: { ...value, status: "failed", error: err.message || "Unknown error" } });
      } catch {
        // If even marking it failed doesn't succeed, the next run will simply see it as still
        // pending and try again — not silently lost either way.
      }
      failed++;
    }
  }

  return res.status(200).json({ ok: true, checked: due.length, sent, failed });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (req.body?.action === "processScheduledSends") {
    return await handleProcessScheduledSends(req, res);
  }

  // Defaults to "react" — every reaction request already in production, before this action field
  // existed at all, has no such field and must keep working exactly as it always has.
  const { classId, postId, action = "react", storageKey, familyUid, readStateKey, actingAs, collection = "blogPosts" } = req.body || {};

  if (action === "fallbackCheckIn") {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Sign-in required." });
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: "Sign-in session is invalid or expired." });
    }
    try {
      return await handleFallbackCheckIn(req, res, decoded);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      return res.status(500).json({ error: err.message || "Something went wrong." });
    }
  }

  if (action === "backfillMessageRead") {
    if (!classId || !storageKey || !familyUid || !readStateKey) {
      return res.status(400).json({ error: "classId, storageKey, familyUid, and readStateKey are required." });
    }
    try {
      // Always genuinely the teacher's own action specifically — triggered only by a teacher
      // opening a specific thread, never ambiguous the way a dual-role account's OWN blog reading
      // can be, so this one always asks for the teacher role explicitly rather than leaving it to
      // be inferred.
      await requireIdentityAndClassAccess(req, classId, "teacher");
      return await handleBackfillMessageRead(req, res, storageKey, familyUid, readStateKey);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      return res.status(500).json({ error: err.message || "Something went wrong." });
    }
  }

  if (!classId || !postId) return res.status(400).json({ error: "classId and postId are required." });

  let actorId, individualActorId, actorName;
  try {
    ({ actorId, individualActorId, actorName } = await requireIdentityAndClassAccess(req, classId, actingAs));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  try {
    // collection defaults to "blogPosts" — every markRead request already in production, before
    // homework had its own read-tracking at all, has no such field and must keep working exactly
    // as it always did. homework is the one other value this ever actually takes right now,
    // sharing this same endpoint and this same underlying handler rather than a separate file —
    // see markPostRead's own comment, client-side, for why: the deployment is already at Vercel's
    // 12-function cap.
    if (action === "markRead") return await handleMarkRead(req, res, classId, postId, actorId, actorName, collection);
    if (action === "backfillReads") return await handleBackfillReads(req, res, classId, postId);
    // Deliberately individualActorId here, not the shared actorId above — a reaction is a
    // personal, individual expression the same way a like or an emoji reply is anywhere else,
    // never meant to be shared just because two guardians happen to share a household. Using the
    // shared id here was the actual, confirmed bug: one guardian reacting silently overwrote the
    // other's, since the toggle logic below (correctly) treats a repeated id as "the same person
    // changing their mind," which is exactly true for messages and exactly wrong for reactions.
    return await handleReact(req, res, classId, postId, individualActorId, actorName);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err.message || "Something went wrong." });
  }
}
