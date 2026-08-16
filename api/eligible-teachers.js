// api/eligible-teachers.js
// Returns the minimal {uid, name, label} list of staff a signed-in family is allowed to message
// individually — anyone (teacher- or admin-role, that distinction doesn't matter here) whose
// assignedClassIds overlaps this family's linkedClassIds, OR whose messagingClassTypes overlaps
// the grade levels this family is connected to, deduplicated by person either way (someone
// reachable through two of this family's classes, or reachable both by class and by grade level,
// still appears exactly once).
//
// label is admin's own per-class description of that person's actual role there (e.g. "Judaic
// Studies Teacher"), since the same person's role can genuinely differ by classroom — never
// derived from anything about the account itself. When a person is reachable through more than
// one of this family's classes, whichever of those classes actually has a label set for them
// wins; if none do, label comes back empty and the app falls back to just their name.
//
// This runs server-side specifically because families have no Firestore-level read access to
// teacher:* records at all (only that person can read their own, and admin can read any) — giving
// families that access directly would leak every staff member's full record (email, etc.) just to
// support "who can I message," so this hands back only the fields that are actually needed.
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

async function requireActiveFamily(req) {
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
  const familyDoc = await db.collection("data").doc(`family:${decoded.uid}`).get();
  if (!familyDoc.exists || familyDoc.data().value?.active === false) {
    throw { status: 403, message: "Account not recognized." };
  }
  return { uid: decoded.uid, family: familyDoc.data().value };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let uid, family;
  try {
    ({ uid, family } = await requireActiveFamily(req));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const linkedClassIds = family.linkedClassIds || [];
  const linkedClassTypes = family.linkedClassTypes || [];
  if (linkedClassIds.length === 0 && linkedClassTypes.length === 0) {
    return res.status(200).json({ teachers: [] });
  }

  const db = getFirestore();

  // Needed to translate this family's linkedClassTypes overlap back into actual classIds (for
  // label lookup), and to know which of the family's own classes share a grade-level-reachable
  // person's type — the family record only stores the type list, not which specific class ids
  // produced it.
  const classesSnap = await db.collection("data").doc("schoolClasses").get();
  const allClasses = classesSnap.exists ? classesSnap.data().value || [] : [];
  const classTypeById = Object.fromEntries(allClasses.map((c) => [c.id, c.classType]));

  // Every one of this family's linked classes, plus every other class sharing a type this family
  // is connected to — the full set of classIds whose messagingLabels could plausibly apply here.
  const candidateClassIds = new Set(linkedClassIds);
  allClasses.forEach((c) => { if (linkedClassTypes.includes(c.classType)) candidateClassIds.add(c.id); });

  const labelDocs = await Promise.all(
    [...candidateClassIds].map((id) => db.collection("data").doc(`class:${id}:messagingLabels`).get())
  );
  const labelsByClassId = {};
  [...candidateClassIds].forEach((id, i) => { labelsByClassId[id] = labelDocs[i].exists ? labelDocs[i].data().value || {} : {}; });

  // Queries both roles now, not just "teacher" — an admin-role account can be just as
  // individually reachable as a teacher-role one (assignedClassIds or messagingClassTypes work
  // the same way regardless of role), since role is about that person's own level of access
  // elsewhere in the app, not about whether parents may message them directly.
  const snapshot = await db.collection("data").where("value.role", "in", ["teacher", "admin"]).get();
  // Firestore's own query planner doesn't let us filter "array overlaps another array" server-
  // side the way it can for a fixed list, so the overlap check happens here instead — the query
  // above only narrows to actual staff records first, which keeps this from having to compare
  // against every document in the whole collection.
  const teachers = [];
  snapshot.forEach((doc) => {
    const t = doc.data().value;
    if (!t || t.active === false) return;
    const assigned = t.assignedClassIds || [];
    const messagingTypes = t.messagingClassTypes || [];
    // Every one of the family's classes that actually makes this person eligible — either
    // directly assigned, or matching by grade level.
    const eligibleViaClassIds = linkedClassIds.filter((id) => assigned.includes(id));
    const eligibleViaClassTypes = [...candidateClassIds].filter((id) => messagingTypes.includes(classTypeById[id]) && linkedClassTypes.includes(classTypeById[id]));
    const relevantClassIds = [...new Set([...eligibleViaClassIds, ...eligibleViaClassTypes])];
    if (relevantClassIds.length === 0) return;
    const label = relevantClassIds.map((id) => labelsByClassId[id]?.[t.uid]).find((l) => l && l.trim()) || "";
    teachers.push({ uid: t.uid, name: t.name, label });
  });

  return res.status(200).json({ teachers });
}