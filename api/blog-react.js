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
    return { actorId: decoded.uid, actorName: teacher.name || "Teacher" };
  };
  const asFamily = () => {
    if (!family || family.active === false) return null;
    if (!(family.linkedClassIds || []).includes(classId)) throw { status: 403, message: "You don't have access to this class." };
    return { actorId: family.familyGroupId || family.uid, actorName: family.name || "Family" };
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

async function handleMarkRead(req, res, classId, postId, actorId, actorName) {
  const db = getFirestore();
  const ref = db.collection("data").doc(`class:${classId}:blogPosts`);
  // Same atomic-transaction reasoning as handleReact above — two people opening the same post
  // within the same moment shouldn't be able to race and lose one of their read records to the
  // other's write landing second.
  const nextPosts = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const posts = snap.exists ? snap.data().value || [] : [];
    const post = posts.find((p) => p.id === postId);
    if (!post) throw { status: 404, message: "Post not found." };

    const existingReadBy = post.readBy || [];
    // Idempotent on purpose — a parent opening the Blog tab marks every currently-loaded post
    // read every time, including ones they've already read before, so this has to be cheap and
    // safe to call repeatedly without growing the list or writing anything when nothing's
    // actually new.
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Defaults to "react" — every reaction request already in production, before this action field
  // existed at all, has no such field and must keep working exactly as it always has.
  const { classId, postId, action = "react", storageKey, familyUid, readStateKey, actingAs } = req.body || {};

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

  let actorId, actorName;
  try {
    ({ actorId, actorName } = await requireIdentityAndClassAccess(req, classId, actingAs));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  try {
    if (action === "markRead") return await handleMarkRead(req, res, classId, postId, actorId, actorName);
    if (action === "backfillReads") return await handleBackfillReads(req, res, classId, postId);
    return await handleReact(req, res, classId, postId, actorId, actorName);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err.message || "Something went wrong." });
  }
}
