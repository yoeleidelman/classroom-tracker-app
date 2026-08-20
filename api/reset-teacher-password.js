// api/reset-teacher-password.js
// Directly sets a NEW password for an existing teacher, admin-side, bypassing the normal
// "Forgot password" email round-trip entirely — built specifically so an admin can unblock
// someone right now, on the spot, without depending on that person being free to go check their
// own inbox. Setting somebody else's password requires elevated admin credentials that must
// never be exposed in the browser, so — same as create-teacher.js — this can only safely run here.
//
// SECURITY: without verifying the caller first, anyone who found this URL could reset ANY
// teacher's password, including an admin's own — every request must prove, via a real Firebase ID
// token, that it comes from an existing, active admin before anything happens. Mirrors
// create-teacher.js's own requireAdmin check exactly, for the same reason.
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

  const { uid, newPassword } = req.body || {};
  const trimmedPassword = (newPassword || "").trim();
  if (!uid || !trimmedPassword || trimmedPassword.length < 6) {
    return res.status(400).json({ error: "A teacher and a password of at least 6 characters are required." });
  }

  try {
    const auth = getAuth();
    // Trimmed here, not just on the sign-in side — an untrimmed password stored here would be
    // permanently wrong no matter how carefully anyone typed it afterward at sign-in, since the
    // mismatch would already be baked into the account itself. This file was also, separately,
    // never actually deployed at all until now — found only by tracing a real, reported sign-in
    // failure back through account creation, not by anything failing loudly.
    await auth.updateUser(uid, { password: trimmedPassword });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong setting the password." });
  }
}
