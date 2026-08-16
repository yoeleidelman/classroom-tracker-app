// api/blog-react.js
// Applies a reaction to a blog post (or one specific block within it) entirely server-side —
// this exists specifically because Firestore rules cannot express "you may only modify your own
// entry inside a nested array of reaction objects." The existing client-side rule for blogPosts
// can only validate that the overall array length doesn't change (blocking mass deletion or a
// fake post being injected), which is real protection, but leaves a real gap underneath it: any
// signed-in family or teacher could, via a direct write bypassing the app's own UI, spoof any
// OTHER person's name and id onto a reaction entry, as long as the total count didn't change.
//
// The fix is to never let the client supply who's reacting at all. This endpoint reads the
// caller's OWN identity from their own account record — a family's stored name and shared
// familyGroupId, or a teacher's stored name and uid — using the same server-verified auth token
// every other secured endpoint in this app relies on, and applies the reaction using that. The
// request body only ever carries WHAT they reacted with (an emoji key), never WHO is reacting.
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

const BLOG_REACTION_KEYS = ["heart", "smile", "thumbsup", "clap", "laugh", "wow", "pray"];

// Same single-choice toggle logic as computeSingleChoiceReactions on the client — kept in sync by
// hand since this runs in a separate execution environment; picking a new reaction replaces
// whichever one this reactor already had, picking the same one again removes it.
function computeSingleChoiceReactions(existingReactions, emoji, reactorId, reactorName) {
  const reactions = {};
  Object.entries(existingReactions || {}).forEach(([key, entries]) => {
    reactions[key] = (entries || []).filter((entry) => (typeof entry === "string" ? entry : entry?.id) !== reactorId);
  });
  const alreadyHadThisOne = (existingReactions?.[emoji] || []).some((entry) => (typeof entry === "string" ? entry : entry?.id) === reactorId);
  if (!alreadyHadThisOne) reactions[emoji] = [...(reactions[emoji] || []), { id: reactorId, name: reactorName }];
  return reactions;
}

async function requireIdentityAndClassAccess(req, classId) {
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
  const [teacherDoc, familyDoc] = await Promise.all([
    db.collection("data").doc(`teacher:${decoded.uid}`).get(),
    db.collection("data").doc(`family:${decoded.uid}`).get(),
  ]);
  const teacher = teacherDoc.exists ? teacherDoc.data().value : null;
  const family = familyDoc.exists ? familyDoc.data().value : null;

  if (teacher && teacher.active !== false) {
    const isAdmin = teacher.role === "admin";
    const hasAccess = isAdmin || (teacher.assignedClassIds || []).includes(classId);
    if (!hasAccess) throw { status: 403, message: "You don't have access to this class." };
    return { reactorId: decoded.uid, reactorName: teacher.name || "Teacher" };
  }
  if (family && family.active !== false) {
    if (!(family.linkedClassIds || []).includes(classId)) throw { status: 403, message: "You don't have access to this class." };
    return { reactorId: family.familyGroupId || family.uid, reactorName: family.name || "Family" };
  }
  throw { status: 403, message: "Account not recognized." };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { classId, postId, blockId, emoji } = req.body || {};
  if (!classId || !postId || !emoji) return res.status(400).json({ error: "classId, postId, and emoji are required." });
  if (!BLOG_REACTION_KEYS.includes(emoji)) return res.status(400).json({ error: "Not a recognized reaction." });

  let reactorId, reactorName;
  try {
    ({ reactorId, reactorName } = await requireIdentityAndClassAccess(req, classId));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  try {
    const db = getFirestore();
    const ref = db.collection("data").doc(`class:${classId}:blogPosts`);
    // Runs as an atomic transaction rather than a plain read-then-write — without this, two
    // people reacting to the same post within the same moment could race: both read the same
    // starting array, both compute their own change against it, and whichever write lands second
    // silently overwrites the first, losing that reaction. A transaction guarantees the read and
    // the write happen as one atomic step, so a concurrent second reaction is guaranteed to be
    // computed against the first one's result, not against stale data.
    const nextPosts = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const posts = snap.exists ? snap.data().value || [] : [];
      const post = posts.find((p) => p.id === postId);
      if (!post) throw { status: 404, message: "Post not found." };

      let updated;
      if (blockId) {
        const nextBlocks = post.blocks.map((b) => (b.id === blockId
          ? { ...b, reactions: computeSingleChoiceReactions(b.reactions, emoji, reactorId, reactorName) }
          : b));
        updated = posts.map((p) => (p.id === postId ? { ...p, blocks: nextBlocks } : p));
      } else {
        const reactions = computeSingleChoiceReactions(post.reactions, emoji, reactorId, reactorName);
        updated = posts.map((p) => (p.id === postId ? { ...p, reactions } : p));
      }
      tx.set(ref, { value: updated });
      return updated;
    });

    return res.status(200).json({ ok: true, posts: nextPosts });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err.message || "Something went wrong recording the reaction." });
  }
}