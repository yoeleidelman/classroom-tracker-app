// api/create-teacher.js
// Creates a real Firebase Auth login for a teacher, then writes their own record as its own
// document (data/teacher:{uid}) rather than appending to one shared list — this is what lets
// Firestore security rules check "is this document mine" precisely. This can only safely run
// on the server: creating another person's account requires elevated admin credentials that
// must never be exposed in the browser.
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

  const { name, email, password, role, assignedClassIds, isSubstitute } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
  }

  try {
    const auth = getAuth();
    const userRecord = await auth.createUser({ email, password, displayName: name });

    const db = getFirestore();
    const ref = db.collection("data").doc(`teacher:${userRecord.uid}`);
    await ref.set({
      value: {
        uid: userRecord.uid, name, email, role: role || "teacher",
        assignedClassIds: assignedClassIds || [], isSubstitute: !!isSubstitute, active: true,
      },
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    const message = err.code === "auth/email-already-exists" ? "That email already has an account." : (err.message || "Something went wrong creating the account.");
    return res.status(500).json({ error: message });
  }
}