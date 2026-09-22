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

  // Reported directly, urgent: real data loss (points, attendance) for a class from an earlier
  // fix's own bug today. Every other recovery avenue was checked directly and ruled out (no
  // separate log of individual point-award events exists anywhere in this app's own data model; no
  // client-side Firestore cache exists in the browser either). Folded into this existing route
  // rather than adding a new one, to stay under this project's serverless function count limit —
  // adding a 13th route earlier today is exactly what silently broke deployment.
  if (req.body?.action === "recover") {
    const { docIds, readTimeISO } = req.body;
    if (!Array.isArray(docIds) || docIds.length === 0) return res.status(400).json({ error: "docIds (array) is required." });
    if (!readTimeISO) return res.status(400).json({ error: "readTimeISO is required." });
    const db = getFirestore();
    const { Timestamp } = await import("firebase-admin/firestore");
    const readTime = Timestamp.fromDate(new Date(readTimeISO));
    // Reported directly: a single DocumentReference's own .get({readTime}) silently ignored the
    // option entirely rather than erroring, always returning current data regardless of what was
    // asked for — confirmed directly by requesting an impossible, far-future readTime and getting
    // the exact same result back with no error at all. db.getAll(...refs, {readTime}) is the
    // Admin SDK's real point-in-time read path.
    const refs = docIds.map((id) => db.collection("data").doc(id));
    const results = {};
    const errors = {};
    try {
      const snaps = await db.getAll(...refs, { readTime });
      snaps.forEach((snap, i) => { results[docIds[i]] = snap.exists ? snap.data() : null; });
    } catch (err) {
      docIds.forEach((id) => { errors[id] = err.message || String(err); });
    }
    return res.status(200).json({ ok: true, results, errors });
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

  return res.status(200).json({
    ok: true,
    authAccount,
    authError,
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
