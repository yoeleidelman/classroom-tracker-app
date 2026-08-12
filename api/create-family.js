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
//
// Second guardians work the same way conceptually: a genuinely separate login (own email, own
// password), but tagged with the same familyGroupId as the first guardian, plus a copy of their
// studentLinks/linkedClassIds — so both logins resolve to the exact same children and the exact
// same conversations, without needing to re-pick students for the second parent.
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
 
  const { name, email, password, studentLinks, familyGroupId } = req.body || {};
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
    const links = studentLinks || [];
    // A flat, security-rule-friendly list alongside the richer studentLinks — a rule can check
    // "is this class id in this array" reliably, but can't safely search inside an array of
    // {classId, studentId, ...} objects for a matching field the same way.
    const linkedClassIds = [...new Set(links.map((l) => l.classId))];
    // A brand-new family (no familyGroupId passed in) is its own group of one, identified by its
    // own uid — a second guardian added later passes the first guardian's uid here explicitly, so
    // both end up pointing at the same group without needing a separate id generator.
    const resolvedGroupId = familyGroupId || userRecord.uid;
    await ref.set({
      value: {
        uid: userRecord.uid, name, email,
        studentLinks: links, linkedClassIds, familyGroupId: resolvedGroupId, active: true,
      },
    });
 
    return res.status(200).json({ ok: true, uid: userRecord.uid, linkedExisting });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong creating the account." });
  }
}
 