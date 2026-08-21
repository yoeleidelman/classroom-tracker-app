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
// create-teacher.js's own requireAdmin check exactly, for the same reason — the two used to
// carry their own separate, word-for-word copies of it.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin, trimAndCheckPassword } from "./_lib/account-helpers.js";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const { uid, newPassword } = req.body || {};
  const { trimmed: trimmedPassword, valid: passwordValid } = trimAndCheckPassword(newPassword);
  if (!uid || !passwordValid) {
    return res.status(400).json({ error: "A teacher and a password of at least 6 characters are required." });
  }

  try {
    const auth = getAuth();
    await auth.updateUser(uid, { password: trimmedPassword });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong setting the password." });
  }
}
