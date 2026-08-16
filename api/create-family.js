// api/create-family.js
// Creates a real Firebase Auth login for a family, then writes their own record as its own
// document (data/family:{uid}) — the same pattern create-teacher.js uses for teachers, so
// Firestore security rules can check "is this document mine" precisely. This can only safely run
// on the server: creating another person's account requires elevated admin credentials that must
// never be exposed in the browser.
//
// SECURITY: studentLinks/familyGroupId came straight from the request body with nothing checking
// who was asking — anyone who found this URL could hand-pick which children a new "family" gets
// linked to, or attach themselves to an existing family's familyGroupId to read that family's
// real messages. Every request must now prove it comes from a signed-in, active teacher or admin,
// and a non-admin teacher is additionally limited to linking only their own assigned classes.
//
// One deliberate exception to "creates a new login": Firebase Auth only ever allows one account
// per email, full stop — there's no way around that, and no reason to want one, since a teacher
// who's also a parent here should sign in once, not juggle two logins for one person. So if the
// email already belongs to an existing account (most commonly a teacher's), this doesn't try to
// create a second one and fail — it attaches the new family record onto that same, existing
// login instead. The person keeps signing in with the password they already have.
//
// Second guardians work the same way conceptually: a genuinely separate login (own email, own
// password), but tagged with the same familyGroupId as the first guardian, plus a copy of their
// studentLinks/linkedClassIds — so both logins resolve to the exact same children and the exact
// same conversations, without needing to re-pick students for the second parent.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// Verifies the request comes from a signed-in, active teacher or admin, and returns their own
// record so the handler can additionally check which classes a non-admin caller may link to.
async function requireActiveStaff(req) {
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
  if (!caller || caller.active === false) {
    throw { status: 403, message: "Staff access required." };
  }
  return caller;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let caller;
  try {
    caller = await requireActiveStaff(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const { name, email, password, studentLinks, familyGroupId } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Family name, email, and a password of at least 6 characters are required." });
  }

  const links = studentLinks || [];
  const linkedClassIds = [...new Set(links.map((l) => l.classId))];
  // A non-admin teacher may only link students into classes they're actually assigned to — admins
  // manage the whole school and aren't limited this way.
  if (caller.role !== "admin") {
    const allowed = new Set(caller.assignedClassIds || []);
    const outOfScope = linkedClassIds.some((id) => !allowed.has(id));
    if (outOfScope) {
      return res.status(403).json({ error: "You can only link students to your own assigned classes." });
    }
  }

  try {
    const auth = getAuth();
    let userRecord;
    let linkedExisting = false;

    try {
      userRecord = await auth.createUser({ email, password, displayName: name });
    } catch (err) {
      if (err.code !== "auth/email-already-exists") throw err;
      // Already has a login (e.g. this person is also a teacher) — reuse it rather than fail.
      userRecord = await auth.getUserByEmail(email);
      linkedExisting = true;
    }

    const db = getFirestore();
    const ref = db.collection("data").doc(`family:${userRecord.uid}`);
    // A brand-new family (no familyGroupId passed in) is its own group of one, identified by its
    // own uid — a second guardian added later passes the first guardian's uid here explicitly, so
    // both end up pointing at the same group without needing a separate id generator.
    const resolvedGroupId = familyGroupId || userRecord.uid;
    // linkedClassTypes denormalizes each linked class's own type (elementary, preschool, ...)
    // straight onto the family record, the same way linkedClassIds denormalizes the ids — a
    // security rule can't loop over each class to look its type up, so this is what lets someone
    // reachable by "every elementary parent" actually be reachable, without a per-class lookup.
    let linkedClassTypes = [];
    if (linkedClassIds.length > 0) {
      const registrySnap = await db.collection("data").doc("schoolClasses").get();
      const registry = registrySnap.exists ? registrySnap.data().value || [] : [];
      linkedClassTypes = [...new Set(linkedClassIds.map((id) => registry.find((c) => c.id === id)?.classType).filter(Boolean))];
    }
    await ref.set({
      value: {
        uid: userRecord.uid, name, email,
        studentLinks: links, linkedClassIds, linkedClassTypes, familyGroupId: resolvedGroupId, active: true,
      },
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid, linkedExisting });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong creating the account." });
  }
}