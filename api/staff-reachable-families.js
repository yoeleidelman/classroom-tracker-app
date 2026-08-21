// api/staff-reachable-families.js
// Returns every family reachable through the SIGNED-IN caller's own messagingClassTypes (grade-
// level reach) — for a staff member with no assignedClassIds of their own at all, this is the
// only way they're reachable, so it's the one query their standalone messages page depends on.
//
// Deliberately its own endpoint rather than a mode added to class-families.js: that endpoint's
// access check is "do you own this ONE classId," which doesn't fit here at all — there's no
// classId being asked about, the question is "what does MY OWN messagingClassTypes list make me
// eligible to see," so the caller's identity IS the query, not a parameter to check against it.
//
// SAFETY FIX: this used to query only by linkedClassTypes, a derived field with the exact same
// gap found and fixed in class-families.js — it only gets populated the first time that SPECIFIC
// guardian signs in after it was added to the app, so a guardian who hasn't signed in since stays
// invisible to this query indefinitely, even though their real, authoritative studentLinks (set
// at account creation) is completely correct. Now derives each family's true class types directly
// from studentLinks + the live class registry as the authoritative check, with linkedClassTypes
// only used as a quick pre-check where it's already present — never as the sole basis for
// exclusion.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { requireActiveStaff } = require("./_lib/account-helpers.js");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
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
  const wantedTypes = new Set(messagingClassTypes);

  const db = getFirestore();
  const classesDoc = await db.collection("data").doc("schoolClasses").get();
  const classList = classesDoc.exists ? (classesDoc.data().value || []) : [];
  const classTypeById = {};
  classList.forEach((c) => {
    if (c?.id) classTypeById[c.id] = c.classType || "elementary";
  });

  // Scoped to just the family:* id range — far cheaper than scanning the whole data collection,
  // while still not depending on any one field being present or correct.
  const snapshot = await db.collection("data")
    .orderBy(FieldPath.documentId())
    .startAt("family:")
    .endAt("family:\uf8ff")
    .get();

  const families = [];
  snapshot.forEach((doc) => {
    const f = doc.data().value;
    if (!f || f.active === false) return;
    const viaStored = Array.isArray(f.linkedClassTypes) && f.linkedClassTypes.some((t) => wantedTypes.has(t));
    const viaDerived = Array.isArray(f.studentLinks) && f.studentLinks.some((l) => l?.classId && wantedTypes.has(classTypeById[l.classId]));
    if (viaStored || viaDerived) families.push(f);
  });

  return res.status(200).json({ families });
}
