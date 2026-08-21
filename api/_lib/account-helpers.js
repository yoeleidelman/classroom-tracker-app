// Shared server-side account logic — previously the same few pieces, independently rewritten in
// multiple api/*.js files. Each was found to be a genuine, word-for-word or near-identical
// duplicate before being moved here, the same verify-before-merging discipline used for every
// other consolidation tonight — nothing here changes behavior, it only removes the duplication.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Trimmed here, not just on the sign-in side — a stray leading or trailing space (an easy mistake
// copy-pasting a temp password, or autocorrect) would otherwise get permanently baked into the
// account itself at creation or reset. No amount of careful, correct typing at sign-in afterward
// could ever match a password that was wrong from the very first moment it was stored. Returns
// the trimmed value and whether it clears the minimum length — callers keep their own specific
// error wording, since that differs slightly between them (creating a teacher vs. a family vs.
// resetting an existing password) and isn't part of what was actually duplicated.
export function trimAndCheckPassword(raw, minLength = 6) {
  const trimmed = (raw || "").trim();
  return { trimmed, valid: trimmed.length >= minLength };
}

// Verifies a request comes from a signed-in, active admin specifically — used by the two files
// where that's the exact rule (creating a teacher account, resetting one's password). Throws
// {status, message} on any failure so each handler can respond with its own wording without
// leaking why it failed.
export async function requireAdmin(req) {
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

// Firebase Auth allows exactly one account per email, full stop — there's no way around that, and
// no reason to want one, since a person who already has a login here (most commonly as a parent
// or a teacher) shouldn't be blocked from also getting the other role, or forced into a second,
// separate login for the same person. Used by both create-teacher.js and create-family.js, in
// each direction: if the email already belongs to an existing account, this attaches the new
// record onto that same login instead of trying (and failing) to create a second one.
export async function createOrLinkAuthUser({ email, password, displayName }) {
  const auth = getAuth();
  try {
    const userRecord = await auth.createUser({ email, password, displayName });
    return { userRecord, linkedExisting: false };
  } catch (err) {
    if (err.code !== "auth/email-already-exists") throw err;
    const userRecord = await auth.getUserByEmail(email);
    return { userRecord, linkedExisting: true };
  }
}
