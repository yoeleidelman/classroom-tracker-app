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
//
// SAFETY FIX: this used to query only by linkedClassIds (a derived, flattened copy of a family's
// real class links, kept only because Firestore can't efficiently query "does any object in this
// studentLinks array have field classId = X" directly). linkedClassIds only gets populated the
// first time that SPECIFIC guardian signs in after it was added to the app — a real, reported
// incident traced back to exactly this: one of two guardians on the same child hadn't signed in
// since, so their own linkedClassIds was still empty even though their studentLinks (the real,
// authoritative source of truth, set at account creation and never dependent on a later sign-in)
// was completely correct. They were invisible to this exact query, and so never got notified.
// Now checks studentLinks directly as the authoritative source, with linkedClassIds only used as
// a quick pre-check where it's already present — never as the sole basis for exclusion.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { verifyRequestToken } = require("./_lib/account-helpers.js");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// This file's own class-scoped access rule is genuinely unique to it — no other file needs "does
// this caller own this ONE specific class" — so only the shared first step (verify the token
// itself) is pulled from the shared module; this authorization decision stays local.
async function requireClassAccess(req, classId) {
  const decoded = await verifyRequestToken(req);

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
  // Scoped to just the family:* id range, the same prefix-range pattern used elsewhere in this
  // app for a live "every document starting with X" query — far cheaper than scanning the whole
  // data collection, while still not depending on any one field being present or correct.
  const snapshot = await db.collection("data")
    .orderBy(FieldPath.documentId())
    .startAt("family:")
    .endAt("family:\uf8ff")
    .get();

  const families = [];
  snapshot.forEach((doc) => {
    const f = doc.data().value;
    if (!f) return;
    const viaLinkedClassIds = Array.isArray(f.linkedClassIds) && f.linkedClassIds.includes(classId);
    const viaStudentLinks = Array.isArray(f.studentLinks) && f.studentLinks.some((l) => l?.classId === classId);
    if (viaLinkedClassIds || viaStudentLinks) families.push(f);
  });

  return res.status(200).json({ families });
}
