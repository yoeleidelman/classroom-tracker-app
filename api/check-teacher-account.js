// api/check-teacher-account.js
// Looks up a teacher's REAL account state directly from Firebase Auth and Firestore — built in
// direct response to a real, reported pattern this session's earlier fixes (a rate-limit guess,
// a storage-persistence guess) did not actually explain: accounts that worked, then stopped,
// sometimes on one device and not another, across multiple different teachers, not just new
// accounts with a bad password. Guessing at individual causes one at a time wasn't working — this
// is a way to actually SEE an account's true state instead, so a pattern across several broken
// accounts can be spotted directly rather than inferred blind.
//
// SECURITY: this reveals real account metadata (whether an account is disabled, sign-in history)
// for an arbitrary email — every request must prove it comes from a signed-in, active admin
// before anything happens, same as every other admin-only endpoint in this app.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

async function requireAdmin(req) {
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
  const callerDoc = await db.collection("data").doc(`teacher:${decoded.uid}`).get();
  const caller = callerDoc.exists ? callerDoc.data().value : null;
  if (!caller || caller.active === false || caller.role !== "admin") {
    throw { status: 403, message: "Admin access required." };
  }
  return decoded;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  if (req.body?.action === "read-raw") {
    const { docIds } = req.body;
    if (!Array.isArray(docIds) || docIds.length === 0) return res.status(400).json({ error: "docIds (array) is required." });
    const db = getFirestore();
    const results = {};
    for (const id of docIds) {
      const snap = await db.collection("data").doc(id).get();
      results[id] = snap.exists ? snap.data().value : null;
    }
    return res.status(200).json({ ok: true, results });
  }

  // Reported directly: real, accurate attendance data survived after all, in PDF exports the
  // teacher generated the day before the bug hit — restoring it here, merged by date into each
  // student's own current record, never overwriting it wholesale. "preview" (no write) shows
  // exactly what would change before anything actually commits; "commit" performs the same merge
  // for real. Every field other than attendance carries forward completely untouched either way —
  // this reads the CURRENT document as the base and only replaces the one field.
  if (req.body?.action === "restore-attendance") {
    const { entries, commit } = req.body; // entries: [{ docId, attendanceFromPdf: [{date,status,time}] }]
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: "entries (array) is required." });
    const db = getFirestore();
    const preview = [];
    const batch = commit ? db.batch() : null;
    for (const { docId, attendanceFromPdf } of entries) {
      const ref = db.collection("data").doc(docId);
      const snap = await ref.get();
      const current = snap.exists ? snap.data().value : null;
      const currentAttendance = current?.attendance || [];
      const pdfDates = new Set(attendanceFromPdf.map((a) => a.date));
      // Keep every existing entry whose date isn't covered by the PDF (post-Sep-17 real entries,
      // including today's own genuine ones) — replace only the dates the PDF actually covers.
      const keptExisting = currentAttendance.filter((a) => !pdfDates.has(a.date));
      const restored = attendanceFromPdf.map((a) => ({ date: a.date, status: a.status, time: a.time || "", restoredFromPdf: true }));
      const mergedAttendance = [...keptExisting, ...restored].sort((a, b) => (a.date < b.date ? -1 : 1));
      preview.push({
        docId, exists: !!current,
        currentAttendanceCount: currentAttendance.length,
        keptExistingCount: keptExisting.length, keptExistingDates: keptExisting.map((a) => a.date),
        restoredCount: restored.length,
        otherFieldsPreserved: current ? Object.keys(current).filter((k) => k !== "attendance") : [],
      });
      if (commit && current) {
        batch.set(ref, { value: { ...current, attendance: mergedAttendance } });
      }
    }
    if (commit) await batch.commit();
    return res.status(200).json({ ok: true, committed: !!commit, preview });
  }

  const { email } = req.body || {};
  const trimmedEmail = (email || "").trim();
  if (!trimmedEmail) return res.status(400).json({ error: "An email is required." });

  const auth = getAuth();
  const db = getFirestore();

  // A leading/trailing space or different casing typed into the LOOKUP itself would silently
  // return "no such account" even when one genuinely exists — trimmed and lowercased before the
  // lookup, matching how Firebase itself normalizes stored emails, so this reflects the account
  // that's actually there rather than being fooled by the same class of typo this whole
  // investigation is about.
  let authAccount = null;
  let authError = null;
  try {
    const userRecord = await auth.getUserByEmail(trimmedEmail.toLowerCase());
    authAccount = {
      uid: userRecord.uid,
      email: userRecord.email,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime || null,
      lastRefreshTime: userRecord.metadata.lastRefreshTime || null,
      providerIds: (userRecord.providerData || []).map((p) => p.providerId),
    };
  } catch (err) {
    authError = err.code === "auth/user-not-found" ? "No Firebase account exists for this exact email." : (err.message || "Lookup failed.");
  }

  let firestoreRecord = null;
  if (authAccount) {
    const doc = await db.collection("data").doc(`teacher:${authAccount.uid}`).get();
    firestoreRecord = doc.exists ? doc.data().value : null;
  }

  // READ-ONLY diagnosis of "everything shows as unread": what the person's family profile and saved
  // read marks actually look like, and, per thread, the newest message versus the saved read mark.
  // Shows shapes and timestamps only, never message text.
  let familySummary = null;
  let readSummary = null;
  let threads = [];
  if (authAccount) {
    try {
      const uidX = authAccount.uid;
      const fdoc = await db.collection("data").doc(`family:${uidX}`).get();
      const fam = fdoc.exists ? fdoc.data().value : null;
      if (fam) {
        familySummary = {
          name: fam.name, active: fam.active !== false,
          linkedClassIds: fam.linkedClassIds || [],
          studentCount: (fam.studentLinks || []).length,
        };
      }
      const rdoc = await db.collection("data").doc(`read-state:${uidX}`).get();
      const raw = rdoc.exists ? rdoc.data() : null;
      const v = raw ? raw.value : undefined;
      const valueType = !raw ? "no record at all" : v === undefined ? "missing" : v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
      const marks = valueType === "object" ? Object.entries(v).filter(([k, x]) => k !== "snoozed" && typeof x === "string").sort((x, y) => (x[1] < y[1] ? 1 : -1)) : [];
      const topKeys = raw ? Object.keys(raw) : [];
      readSummary = {
        exists: Boolean(raw), valueType, topKeys: topKeys.slice(0, 15), dottedTopKeys: topKeys.filter((k) => k.includes(".")).slice(0, 10),
        markCount: marks.length, newestMark: marks[0]?.[1] || null, oldestMark: marks[marks.length - 1]?.[1] || null,
        strayMarks: topKeys.filter((k) => k.startsWith("value.")).slice(0, 12).map((k) => {
          const nm = k.slice(6);
          return { name: nm, strayAt: typeof raw[k] === "string" ? raw[k] : null, properAt: valueType === "object" && typeof v[nm] === "string" ? v[nm] : null };
        }),
        snoozedCount: valueType === "object" && v.snoozed ? Object.keys(v.snoozed).length : 0,
        sampleMarks: marks.slice(0, 8).map(([k, x]) => ({ key: k, at: x })),
      };
      const mark = (k) => (valueType === "object" && typeof v[k] === "string" ? v[k] : null);
      if (fam) {
        const classIds = [...new Set((fam.linkedClassIds || []).concat((fam.studentLinks || []).map((l) => l.classId)))].slice(0, 6);
        for (const cid of classIds) {
          const m = await db.collection("data").doc(`class:${cid}:messages:${uidX}`).get(); // eslint-disable-line no-await-in-loop
          const msgs = m.exists ? (m.data().value?.messages || []) : [];
          const last = msgs[msgs.length - 1];
          threads.push({ thread: `class-${cid}`, lastMessageAt: last?.timestamp || null, lastFrom: last?.senderType || null, savedReadMark: mark(`class-${cid}`) });
          const h = await db.collection("data").doc(`class:${cid}:homework`).get(); // eslint-disable-line no-await-in-loop
          const posts = h.exists && Array.isArray(h.data().value) ? h.data().value : [];
          const hm = mark(`homework-${cid}`);
          threads.push({ thread: `homework-${cid}`, homeworkPosts: posts.length, savedReadMark: hm, postsNewerThanMark: posts.filter((x) => !hm || new Date(x.timestamp) > new Date(hm)).length });
        }
        const a = await db.collection("data").doc(`admin-messages:${uidX}`).get();
        const am = a.exists ? (a.data().value?.messages || []) : [];
        const al = am[am.length - 1];
        threads.push({ thread: `admin-${uidX}`, lastMessageAt: al?.timestamp || null, lastFrom: al?.senderType || null, savedReadMark: mark(`admin-${uidX}`) });
      }
    } catch (e) { readSummary = { error: e.message || String(e) }; }
  }

  return res.status(200).json({
    ok: true,
    authAccount,
    authError,
    familySummary, readSummary, threads,
    firestoreRecord: firestoreRecord ? {
      name: firestoreRecord.name,
      email: firestoreRecord.email,
      role: firestoreRecord.role,
      active: firestoreRecord.active !== false,
      assignedClassIds: firestoreRecord.assignedClassIds || [],
      // Surfaced specifically to catch a real, plausible mismatch: the Auth account's own email
      // (what sign-in actually checks against) silently drifting from the Firestore record's
      // copy of it (what's displayed in admin) — invisible anywhere else, since admin only ever
      // shows the Firestore copy.
      emailMatchesAuth: authAccount ? firestoreRecord.email?.toLowerCase() === authAccount.email?.toLowerCase() : null,
    } : null,
  });
}
