// api/recover-student-data.js
// TEMPORARY, one-off recovery tool. Built in direct response to a real, reported data-loss
// incident: a bug in an earlier fix overwrote real students' own data records (points,
// attendance, and everything else on that record) with blank ones, for a specific class. This
// attempts the one remaining real avenue for getting that data back: Firestore itself can read a
// document's state as of a specific past moment, via a read-time query, PROVIDED the underlying
// database has point-in-time recovery available for that moment. This is not guaranteed to work —
// it depends entirely on a database-level setting this app's own code has no control over — but it
// is attempted here as the only path left, given every other one (a separate log, a client-side
// cache) was checked directly and ruled out.
//
// SECURITY: same admin-only guard as every other privileged endpoint in this app.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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

  const { docIds, readTimeISO } = req.body || {};
  if (!Array.isArray(docIds) || docIds.length === 0) return res.status(400).json({ error: "docIds (array) is required." });
  if (!readTimeISO) return res.status(400).json({ error: "readTimeISO is required." });

  const db = getFirestore();
  const readTime = Timestamp.fromDate(new Date(readTimeISO));

  const results = {};
  const errors = {};
  for (const id of docIds) {
    try {
      const snap = await db.collection("data").doc(id).get({ readTime });
      results[id] = snap.exists ? snap.data() : null;
    } catch (err) {
      errors[id] = err.message || String(err);
    }
  }

  return res.status(200).json({ ok: true, results, errors });
}
