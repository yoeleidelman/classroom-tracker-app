// api/create-teacher.js
// Creates a real Firebase Auth login for a teacher, then writes their own record as its own
// document (data/teacher:{uid}) rather than appending to one shared list — this is what lets
// Firestore security rules check "is this document mine" precisely. This can only safely run
// on the server: creating another person's account requires elevated admin credentials that
// must never be exposed in the browser.
//
// SECURITY: this creates accounts with an arbitrary role, including "admin" — without verifying
// the caller first, anyone who finds this URL could create themselves an admin login with no
// authentication at all. Every request must now prove, via a real Firebase ID token, that it
// comes from an existing, active admin before anything happens.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// Verifies the request actually comes from a signed-in, active admin. Throws {status, message}
// on any failure so the handler can respond appropriately without leaking why it failed.
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

  const { name, email, password, role, assignedClassIds, isSubstitute, messagingClassTypes } = req.body || {};
  const trimmedEmail = (email || "").trim();
  const trimmedPassword = (password || "").trim();
  if (!name || !trimmedEmail || !trimmedPassword || trimmedPassword.length < 6) {
    return res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
  }

  try {
    const auth = getAuth();
    // Trimmed here, not just on the sign-in side — a stray leading or trailing space (an easy
    // mistake copy-pasting a temp password, or autocorrect) would otherwise get permanently baked
    // into the account itself at creation. No amount of correct, careful typing at sign-in
    // afterward could ever match a password that was wrong from the very first moment the account
    // existed — this is what a real, reported "auth/invalid-credential" failure on a brand new
    // account, on its very first sign-in attempt, actually traced back to.
    // Mirrors create-family.js's own handling of this same situation in the opposite direction:
    // Firebase Auth allows exactly one account per email, and a person who's already a parent
    // here (most commonly) shouldn't be blocked from also getting a teacher login, or forced into
    // a second, separate login for the same person. If the email already belongs to an account,
    // this attaches the new teacher record onto that same existing login instead of trying (and
    // failing) to create a second one — before this fix, this direction had no such handling at
    // all, so creating a teacher account for an existing parent email failed outright with "that
    // email already has an account," and the two roles never linked.
    let userRecord;
    let linkedExisting = false;
    try {
      userRecord = await auth.createUser({ email: trimmedEmail, password: trimmedPassword, displayName: name });
    } catch (err) {
      if (err.code !== "auth/email-already-exists") throw err;
      userRecord = await auth.getUserByEmail(trimmedEmail);
      linkedExisting = true;
    }

    const db = getFirestore();
    const ref = db.collection("data").doc(`teacher:${userRecord.uid}`);
    await ref.set({
      value: {
        uid: userRecord.uid, name, email: trimmedEmail, role: role || "teacher",
        assignedClassIds: assignedClassIds || [], isSubstitute: !!isSubstitute,
        // Reaches every parent with a child in one of these grade levels, independent of any
        // specific class assignment — how someone like a curriculum coordinator becomes
        // individually messageable without being assigned to every matching class one by one.
        messagingClassTypes: messagingClassTypes || [], active: true,
      },
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid, linkedExisting });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong creating the account." });
  }
}
