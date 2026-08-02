import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password, role, assignedClassIds, isSubstitute } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });

    const db = admin.firestore();
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