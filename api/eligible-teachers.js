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
const { getFirestore } = require("firebase-admin/firestore");
const { verifyRequestToken } = require("./_lib/account-helpers.js");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

async function requireActiveFamily(req) {
  const decoded = await verifyRequestToken(req);

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

  const db = getFirestore();

  // Everything below that doesn't actually need the caller's identity to START (as opposed to to
  // return) is kicked off immediately, in parallel with auth verification — this is the fix for
  // the visible lag between classes (already in memory client-side) and teachers (this whole
  // endpoint) on the parent Messages tab. The previous version ran every one of these Firestore
  // reads one after another even though most of them don't actually depend on each other's
  // result: the school's class registry doesn't depend on who's asking, and the staff query
  // itself doesn't either — only the FILTERING of that query's results against this specific
  // family's linked classes has to wait for the family record. Nothing sensitive is exposed by
  // starting these reads early, since nothing is returned to the client until auth succeeds.
  const classesPromise = db.collection("data").doc("schoolClasses").get();
  const staffQueryPromise = db.collection("data").where("value.role", "in", ["teacher", "admin"]).get();

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

  // Needed to translate this family's linkedClassTypes overlap back into actual classIds (for
  // label lookup), and to know which of the family's own classes share a grade-level-reachable
  // person's type — the family record only stores the type list, not which specific class ids
  // produced it.
  const classesSnap = await classesPromise;
  const allClasses = classesSnap.exists ? classesSnap.data().value || [] : [];
  // A class created before classType existed as a field at all has no classType key in its
  // stored record — defaulting the missing case to "elementary" here (matching the same default
  // already used when a class is first created) is what keeps a class like that from being
  // silently excluded from grade-level matching entirely. Without this, a family whose only
  // linked class predates this field would never see any grade-level-reachable staff at all,
  // since every comparison below would be checking against undefined instead of "elementary".
  const classTypeById = Object.fromEntries(allClasses.map((c) => [c.id, c.classType || "elementary"]));

  // Every one of this family's linked classes, plus every other class sharing a type this family
  // is connected to — the full set of classIds whose messagingLabels could plausibly apply here.
  const candidateClassIds = new Set(linkedClassIds);
  allClasses.forEach((c) => { if (linkedClassTypes.includes(c.classType || "elementary")) candidateClassIds.add(c.id); });

  // This is the one read that genuinely can't start until candidateClassIds is known, so it still
  // runs after the two above — but it now overlaps with the in-flight staff query above instead
  // of waiting for it to finish first.
  const labelDocs = await Promise.all(
    [...candidateClassIds].map((id) => db.collection("data").doc(`class:${id}:messagingLabels`).get())
  );
  const labelsByClassId = {};
  [...candidateClassIds].forEach((id, i) => { labelsByClassId[id] = labelDocs[i].exists ? labelDocs[i].data().value || {} : {}; });

  // Queries both roles now, not just "teacher" — an admin-role account can be just as
  // individually reachable as a teacher-role one (assignedClassIds or messagingClassTypes work
  // the same way regardless of role), since role is about that person's own level of access
  // elsewhere in the app, not about whether parents may message them directly.
  const snapshot = await staffQueryPromise;
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
    // Per-class, not collapsed to one value the way `label` above is — a teacher whose own admin-
    // assigned role genuinely differs by classroom (Judaic Studies for one of this family's kids,
    // General Studies for another) needs the app to show each child their own correct label, not
    // whichever one happened to be found first across every class this person is reachable
    // through. The conversation itself is unaffected either way — it's keyed by this teacher and
    // this guardian alone, never by class or label, so a parent always lands in the exact same
    // single thread with this person regardless of which child's label led them there; only what's
    // shown on the outside, before that tap, is meant to vary.
    const labelsByClassIdForTeacher = Object.fromEntries(
      relevantClassIds.map((id) => [id, labelsByClassId[id]?.[t.uid] || ""]).filter(([, l]) => l)
    );
    // One of the teacher's OWN assigned classes (not necessarily one shared with this family) —
    // needed only so a tapped notification can deep-link into that teacher's app at all, since
    // entering some class of theirs is a prerequisite their app has for showing any messages
    // screen, including their "Direct" tab, which itself spans every class they teach. A teacher
    // reachable only through messagingClassTypes (no assignedClassIds of their own at all) has
    // none to offer here — the notification link falls back to opening the app normally instead
    // of deep-linking straight to the thread, which is an acceptable, graceful degradation for
    // that specific, narrower case rather than a broken link.
    //
    // classIds and reachableClassTypes are what the app's own "tap a child, see their teachers"
    // filter runs against client-side — eligibleViaClassIds specifically (a teacher directly
    // assigned to one of this child's own classes), separate from messagingTypes filtered down to
    // only the grade levels this family is actually connected to (a teacher reachable by grade
    // level, like a coordinator, without necessarily being assigned to this exact class at all).
    // Both are needed since only classIds can be matched directly against a specific child's own
    // classId, while a grade-level match has to be checked against that child's class's type
    // instead.
    teachers.push({
      uid: t.uid, name: t.name, label, deepLinkClassId: assigned[0] || null,
      classIds: eligibleViaClassIds,
      reachableClassTypes: messagingTypes.filter((type) => linkedClassTypes.includes(type)),
      labelsByClassId: labelsByClassIdForTeacher,
    });
  });

  // Just this family's own linked classes, not the full school registry — enough for the client
  // to know which classType each of ITS OWN children's classes is, so it can check a grade-level-
  // reachable teacher (reachableClassTypes above) against a specific child rather than only being
  // able to match teachers directly assigned to that exact class.
  const linkedClassTypeById = Object.fromEntries(linkedClassIds.map((id) => [id, classTypeById[id]]));

  return res.status(200).json({ teachers, linkedClassTypeById });
}
