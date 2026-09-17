// api/eligible-teachers.js
// Returns the minimal {uid, name, label} list of staff a signed-in family is allowed to message
// individually — anyone (teacher- or admin-role, that distinction doesn't matter here) whose
// assignedClassIds overlaps this family's linkedClassIds, OR whose messagingClassTypes overlaps
// the grade levels this family is connected to, deduplicated by person either way (someone
// reachable through two of this family's classes, or reachable both by class and by grade level,
// still appears exactly once).
//
// label is admin's own description of that person's actual role, stored once directly on their
// own account — one single label per teacher, the same one every family sees, regardless of which
// of that teacher's classes actually connects them. This used to be set per class instead (the
// same person could show up with a different label depending on which class a family reached them
// through), back when a family could still have a genuinely separate conversation per class with
// the same teacher; the messaging redesign collapses that to exactly one thread per person, so a
// label that could still vary by class would only ever look like an arbitrary, unpredictable pick
// rather than a deliberate one.
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
  // SAFETY FIX (same gap already found and fixed in class-families.js and staff-reachable-
  // families.js): linkedClassTypes is a derived, stored field that only gets (re)populated the
  // first time this specific guardian signs in after it was added or changed — a family that
  // hasn't signed in since would otherwise be silently invisible to any grade-level matching
  // below, even though their real, authoritative linkedClassIds is completely correct right now.
  // Combined with the stored value below, once classTypeById is available, rather than trusting
  // the stored value alone.
  const storedLinkedClassTypes = family.linkedClassTypes || [];
  if (linkedClassIds.length === 0 && storedLinkedClassTypes.length === 0) {
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
  const derivedLinkedClassTypes = linkedClassIds.map((id) => classTypeById[id]).filter(Boolean);
  const linkedClassTypes = [...new Set([...storedLinkedClassTypes, ...derivedLinkedClassTypes])];

  // Every one of this family's linked classes, plus every other class sharing a type this family
  // is connected to — still needed below for the eligibility check itself (relevantClassIds), even
  // though it no longer also drives the label lookup the way it used to.
  const candidateClassIds = new Set(linkedClassIds);
  allClasses.forEach((c) => { if (linkedClassTypes.includes(c.classType || "elementary")) candidateClassIds.add(c.id); });

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
  const preschoolClassmatesByClassId = {};
  snapshot.forEach((doc) => {
    const t = doc.data().value;
    if (!t || t.active === false) return;
    const assigned = t.assignedClassIds || [];
    // Every preschool parent can reach every preschool teacher, and vice versa — computed here,
    // at query time, rather than stored on the teacher's own record, so this never shows up as a
    // surprising, auto-added entry in admin's own messagingClassTypes toggle UI (which is meant to
    // reflect only what admin explicitly chose there). A teacher assigned to at least one
    // preschool class is automatically treated as reachable by every preschool family this same
    // way, on top of whatever messagingClassTypes admin may have separately configured for them.
    const isPreschoolStaff = assigned.some((id) => classTypeById[id] === "preschool");
    const messagingTypes = [...new Set([...(t.messagingClassTypes || []), ...(isPreschoolStaff ? ["preschool"] : [])])];
    // Every one of the family's classes that actually makes this person eligible — either
    // directly assigned, or matching by grade level.
    const eligibleViaClassIds = linkedClassIds.filter((id) => assigned.includes(id));
    const eligibleViaClassTypes = [...candidateClassIds].filter((id) => messagingTypes.includes(classTypeById[id]) && linkedClassTypes.includes(classTypeById[id]));
    const relevantClassIds = [...new Set([...eligibleViaClassIds, ...eligibleViaClassTypes])];
    if (relevantClassIds.length === 0) return;
    // One label per teacher now, stored directly on their own account (set once, admin-side, the
    // same way messageSignOff and messagingClassTypes already are) — not one per class the way
    // this used to work. That per-class version made sense back when the same person could show up
    // as a genuinely separate conversation per class; now that every family reaches this same
    // person through exactly one single thread regardless of which of their classes connects them,
    // showing a DIFFERENT label depending on which child happened to lead a parent here would only
    // ever look like an arbitrary, unpredictable pick — never a deliberate choice — since the
    // conversation itself is the same one either way.
    const label = t.messagingLabel || "";
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
    });
    // Reported directly: a preschool room commonly has more than one teacher sharing it, and a
    // parent wanting to reach everyone in the room had no way to do that except messaging each
    // one separately, one at a time. An elementary class, which functions with one main teacher,
    // has no real version of this need, so this is scoped to preschool specifically. Built here,
    // for every one of this family's OWN linked preschool classes (not the whole school's), as
    // {uid, name} for every ACTIVE teacher genuinely assigned to that class — including one whose
    // eligibility here came only through candidateClassIds' own grade-level matching, since
    // "who's actually in the room" is a real fact about the classroom itself, independent of
    // which specific path made any one of them individually reachable by this particular family.
    if (assigned.some((id) => linkedClassIds.includes(id) && classTypeById[id] === "preschool")) {
      assigned.forEach((id) => {
        if (!linkedClassIds.includes(id) || classTypeById[id] !== "preschool") return;
        (preschoolClassmatesByClassId[id] = preschoolClassmatesByClassId[id] || []).push({ uid: t.uid, name: t.name });
      });
    }
  });

  // Just this family's own linked classes, not the full school registry — enough for the client
  // to know which classType each of ITS OWN children's classes is, so it can check a grade-level-
  // reachable teacher (reachableClassTypes above) against a specific child rather than only being
  // able to match teachers directly assigned to that exact class.
  const linkedClassTypeById = Object.fromEntries(linkedClassIds.map((id) => [id, classTypeById[id]]));

  // Only a class with genuinely more than one teacher has anything real to offer here — a
  // single-teacher preschool room "message everyone" would just be a slower way to message the
  // one teacher it already goes to.
  const multiTeacherPreschoolClassmates = Object.fromEntries(
    Object.entries(preschoolClassmatesByClassId).filter(([, list]) => list.length > 1)
  );

  return res.status(200).json({ teachers, linkedClassTypeById, preschoolClassmatesByClassId: multiTeacherPreschoolClassmates });
}
