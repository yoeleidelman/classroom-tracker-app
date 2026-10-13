// api/homework-checkoff.js
// Lets a signed-in parent mark homework done (or undo it) for their OWN child, and read back what
// has been marked. This runs on the server because families have no Firestore access to the
// per-assignment check-off documents (class:{classId}:homeworkChecks:{postId}) at all, and
// opening that up would mean publishing new security rules. Everything a parent is allowed to do
// is decided here, from their verified account, never from anything the browser claims:
//   - the child must really be linked to this parent's account, in that class
//   - the assignment must exist, use check-off, and apply to that child
//   - the tick must fall inside the assignment's dates, plus ONE more day after the last date
//
// Data shape, one document per assignment:
//   { [studentId]: { [partId]: { parent: { at, uid } | absent, teacher: { status, at, by } | absent } } }
// partId is "all" for a once-at-the-end assignment, or the part's own id for a part-by-part one.
// A parent's tap is only ever written under "parent"; a teacher's mark lives under "teacher" and
// always wins when the two disagree. Neither side ever overwrites the other.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const GRACE_DAYS = 1; // a parent can still tick/undo this many days after the assignment's last date

async function requireActiveFamily(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw { status: 401, message: "Sign-in required." };
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    throw { status: 401, message: "Sign-in session is invalid or expired." };
  }
  const snap = await getFirestore().collection("data").doc(`family:${decoded.uid}`).get();
  const family = snap.exists ? snap.data().value : null;
  if (!family || family.active === false) throw { status: 403, message: "Account not recognized." };
  return { uid: decoded.uid, family };
}

// "Today" for the school, not for the server (which runs in UTC).
function schoolToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function appliesTo(post, studentId) {
  if (!post.audience || post.audience === "class") return true;
  return Array.isArray(post.studentIds) && post.studentIds.includes(studentId);
}
function validPartIds(post) {
  if (post.checkoff === "end") return ["all"];
  if (post.checkoff === "parts") return (post.parts || []).map((p) => p.id);
  return [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let uid, family;
  try {
    ({ uid, family } = await requireActiveFamily(req));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const { action, classId, studentId } = req.body || {};
  if (!classId || !studentId || typeof classId !== "string" || typeof studentId !== "string") {
    return res.status(400).json({ error: "classId and studentId are required." });
  }
  const linked = (family.studentLinks || []).some((l) => l.classId === classId && l.studentId === studentId);
  if (!linked) return res.status(403).json({ error: "That child isn't linked to your account." });

  const db = getFirestore();

  try {
    if (action === "get") {
      // Returns, for this one child, what has been marked on each requested assignment.
      const postIds = Array.isArray(req.body.postIds) ? req.body.postIds.slice(0, 60) : [];
      const snaps = await Promise.all(postIds.map((pid) => db.collection("data").doc(`class:${classId}:homeworkChecks:${pid}`).get()));
      const checks = {};
      snaps.forEach((snap, i) => {
        const mine = snap.exists ? (snap.data().value || {})[studentId] || {} : {};
        const out = {};
        Object.keys(mine).forEach((partId) => {
          const rec = mine[partId] || {};
          out[partId] = { parent: !!rec.parent, teacher: rec.teacher?.status || null };
        });
        checks[postIds[i]] = out;
      });
      return res.status(200).json({ ok: true, checks });
    }

    if (action === "set") {
      const { postId, partId, done } = req.body;
      if (!postId || !partId || typeof done !== "boolean") return res.status(400).json({ error: "postId, partId and done are required." });
      const postsSnap = await db.collection("data").doc(`class:${classId}:homework`).get();
      const posts = postsSnap.exists ? postsSnap.data().value || [] : [];
      const post = posts.find((p) => p.id === postId);
      if (!post || !appliesTo(post, studentId)) return res.status(404).json({ error: "That homework wasn't found." });
      if (!validPartIds(post).includes(partId)) return res.status(400).json({ error: "That part doesn't exist." });
      if (post.endDate && schoolToday() > addDays(post.endDate, GRACE_DAYS)) {
        return res.status(409).json({ error: "This homework is closed, so it can't be changed any more.", closed: true });
      }
      const ref = db.collection("data").doc(`class:${classId}:homeworkChecks:${postId}`);
      if (done) {
        // merge-set so a teacher's own mark on the same part is never touched
        await ref.set({ value: { [studentId]: { [partId]: { parent: { at: new Date().toISOString(), uid } } } } }, { merge: true });
      } else {
        await ref.set({ value: { [studentId]: { [partId]: { parent: FieldValue.delete() } } } }, { merge: true });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (err) {
    console.error("homework-checkoff failed", err);
    return res.status(500).json({ error: "Couldn't save that. Please try again." });
  }
}
