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

// The one piece every api/*.js file in this app needed before deciding WHO a request is from -
// parse the bearer token, ask Firebase whether it's genuinely valid right now. Previously
// rewritten, identically, at the top of ten separate files. Returns the decoded token (with
// .uid) on success; throws the same {status, message} shape every caller already expects, so
// swapping this in changes nothing about how any of them respond to a bad or missing token.
export async function verifyRequestToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw { status: 401, message: "Sign-in required." };

  const auth = getAuth();
  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw { status: 401, message: "Sign-in session is invalid or expired." };
  }
}

// Verifies a request comes from a signed-in, active admin specifically — the exact rule shared
// by creating a teacher account, resetting one's password, and checking a teacher's real account
// state. Throws {status, message} on any failure so each handler can respond with its own wording
// without leaking why it failed.
export async function requireAdmin(req) {
  const decoded = await verifyRequestToken(req);

  const db = getFirestore();
  const callerDoc = await db.collection("data").doc(`teacher:${decoded.uid}`).get();
  const caller = callerDoc.exists ? callerDoc.data().value : null;
  if (!caller || caller.active === false || caller.role !== "admin") {
    throw { status: 403, message: "Admin access required." };
  }
  return decoded;
}

// Verifies a request comes from ANY signed-in, currently-active account - teacher or family,
// whichever this uid turns out to be - without caring which one, or requiring anything more
// specific than "this is a real, currently-active person using the app." The rule shared by
// three otherwise-unrelated endpoints (an AI-assist tool, a link-preview fetcher, and the push-
// notification sender) that each just need to confirm a genuine, active caller before doing their
// own actual job - none of them care about role or class access beyond that.
export async function requireActiveAccount(req) {
  const decoded = await verifyRequestToken(req);

  const db = getFirestore();
  const [teacherDoc, familyDoc] = await Promise.all([
    db.collection("data").doc(`teacher:${decoded.uid}`).get(),
    db.collection("data").doc(`family:${decoded.uid}`).get(),
  ]);
  const teacherActive = teacherDoc.exists && teacherDoc.data().value?.active !== false;
  const familyActive = familyDoc.exists && familyDoc.data().value?.active !== false;
  if (!teacherActive && !familyActive) throw { status: 403, message: "Account not recognized." };
  return decoded;
}

// Verifies a request comes from a signed-in, active member of staff - any role, not just admins -
// and returns their own record so a caller can make its own further, more specific decision (like
// which classes they're allowed to touch) on top of this. The rule shared by creating a family
// account and looking up which families a staff member can message.
export async function requireActiveStaff(req) {
  const decoded = await verifyRequestToken(req);

  const db = getFirestore();
  const callerDoc = await db.collection("data").doc(`teacher:${decoded.uid}`).get();
  const caller = callerDoc.exists ? callerDoc.data().value : null;
  if (!caller || caller.active === false) {
    throw { status: 403, message: "Staff access required." };
  }
  return caller;
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
