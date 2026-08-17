// api/staff-reachable-families.js
// Returns every family reachable through the SIGNED-IN caller's own messagingClassTypes (grade-
// level reach) — for a staff member with no assignedClassIds of their own at all, this is the
// only way they're reachable, so it's the one query their standalone messages page depends on.
//
// Deliberately its own endpoint rather than a mode added to class-families.js: that endpoint's
// access check is "do you own this ONE classId," which doesn't fit here at all — there's no
// classId being asked about, the question is "what does MY OWN messagingClassTypes list make me
// eligible to see," so the caller's identity IS the query, not a parameter to check against it.
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

async function requireActiveStaff(req) {
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
  return caller;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let caller;
  try {
    caller = await requireActiveStaff(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const messagingClassTypes = caller.messagingClassTypes || [];
  if (messagingClassTypes.length === 0) {
    return res.status(200).json({ families: [] });
  }

  const db = getFirestore();
  // array-contains-any supports up to 10 values — messagingClassTypes is realistically one or two
  // grade-level types, well inside that limit.
  const snapshot = await db.collection("data").where("value.linkedClassTypes", "array-contains-any", messagingClassTypes).get();
  const families = [];
  snapshot.forEach((doc) => {
    // Belt and suspenders: confirm this is actually a family:* record, not some other document
    // type that coincidentally also has a linkedClassTypes field.
    if (!doc.id.startsWith("family:")) return;
    const f = doc.data().value;
    if (f && f.active !== false) families.push(f);
  });

  return res.status(200).json({ families });
}