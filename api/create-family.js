// api/create-family.js
// Creates a real Firebase Auth login for a family, then writes their own record as its own
// document (data/family:{uid}) — the same pattern create-teacher.js uses for teachers, so
// Firestore security rules can check "is this document mine" precisely. This can only safely run
// on the server: creating another person's account requires elevated admin credentials that must
// never be exposed in the browser.
//
// One deliberate exception to "creates a new login": Firebase Auth only ever allows one account
// per email, full stop — there's no way around that, and no reason to want one, since a teacher
// who's also a parent here should sign in once, not juggle two logins for one person. So if the
// email already belongs to an existing account (most commonly a teacher's), this doesn't try to
// create a second one and fail — it attaches the new family record onto that same, existing
// login instead. The person keeps signing in with the password they already have.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
 
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
 
  const { name, email, password, studentLinks } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Family name, email, and a password of at least 6 characters are required." });
  }
 
  try {
    const auth = getAuth();
    let userRecord;
    let linkedExisting = false;
 
    try {
      userRecord = await auth.createUser({ email, password, displayName: name });
    } catch (err) {
      if (err.code !== "auth/email-already-exists") throw err;
      // Already has a login (e.g. this person is also a teacher) — reuse it rather than fail.
      userRecord = await auth.getUserByEmail(email);
      linkedExisting = true;
    }
 
    const db = getFirestore();
    const ref = db.collection("data").doc(`family:${userRecord.uid}`);
    await ref.set({
      value: {
        uid: userRecord.uid, name, email,
        studentLinks: studentLinks || [], active: true,
      },
    });
 
    return res.status(200).json({ ok: true, uid: userRecord.uid, linkedExisting });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong creating the account." });
  }
}
 