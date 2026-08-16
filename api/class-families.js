// api/class-families.js
// Returns the full family records linked to a specific class — for the teacher who actually
// teaches that class (or admin, for any class). This exists because of a genuine Firestore
// limitation, not a mistake in how the rule was written: a security rule that depends on each
// individual document's own content (here, a family's own linkedClassIds field) can correctly
// allow reading any ONE document one at a time, but can never be proven safe for an unscoped
// LIST query across the whole family:* collection — Firestore has to be able to guarantee the
// rule holds for every possible result without inspecting each one, and a per-document content
// check can't be guaranteed that way. That gap is invisible for admin (who has unconditional
// access), which is exactly why this broke specifically for regular teachers checking their own
// classroom's families, not for admin browsing the same screen.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

async function requireClassAccess(req, classId) {
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
  if (!caller || caller.active === false) {
    throw { status: 403, message: "Staff access required." };
  }
  const isAdmin = caller.role === "admin";
  const hasAccess = isAdmin || (caller.assignedClassIds || []).includes(classId);
  if (!hasAccess) {
    throw { status: 403, message: "You don't have access to this class." };
  }
  return caller;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const classId = req.query.classId;
  if (!classId) {
    return res.status(400).json({ error: "A classId is required." });
  }

  try {
    await requireClassAccess(req, classId);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const db = getFirestore();
  const snapshot = await db.collection("data").where("value.linkedClassIds", "array-contains", classId).get();
  const families = [];
  snapshot.forEach((doc) => {
    // Belt and suspenders: confirm this is actually a family:* record, not some other document
    // type that coincidentally also has a linkedClassIds field.
    if (!doc.id.startsWith("family:")) return;
    const f = doc.data().value;
    if (f) families.push(f);
  });

  return res.status(200).json({ families });
}