// api/blog-mark-read.js
// Records that the signed-in caller has read a specific blog post — entirely server-side, for
// the same underlying reason api/blog-react.js already runs server-side: a client can't be
// trusted to honestly report someone else's identity, and "who read this" is exactly that kind
// of claim. The request body only ever carries WHICH post was read, never WHO read it — that
// comes from the caller's own verified, signed-in account, the same way every other secured
// endpoint in this app already works.
//
// Only ever called from the parent side of the app in practice (opening the Blog tab), but
// accepts either a family or a teacher identity, the same as api/blog-react.js — a co-teacher
// reading a colleague's post is a real, unremarkable case, not something worth specifically
// blocking here.
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
    return { readerId: decoded.uid, readerName: teacher.name || "Teacher" };
  }
  if (family && family.active !== false) {
    if (!(family.linkedClassIds || []).includes(classId)) throw { status: 403, message: "You don't have access to this class." };
    return { readerId: family.familyGroupId || family.uid, readerName: family.name || "Family" };
  }
  throw { status: 403, message: "Account not recognized." };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { classId, postId } = req.body || {};
  if (!classId || !postId) return res.status(400).json({ error: "classId and postId are required." });

  let readerId, readerName;
  try {
    ({ readerId, readerName } = await requireIdentityAndClassAccess(req, classId));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  try {
    const db = getFirestore();
    const ref = db.collection("data").doc(`class:${classId}:blogPosts`);
    // Same atomic-transaction reasoning as api/blog-react.js — two people opening the same post
    // within the same moment shouldn't be able to race and lose one of their read records to the
    // other's write landing second.
    const nextPosts = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const posts = snap.exists ? snap.data().value || [] : [];
      const post = posts.find((p) => p.id === postId);
      if (!post) throw { status: 404, message: "Post not found." };

      const existingReadBy = post.readBy || [];
      // Idempotent on purpose — a parent opening the Blog tab marks every currently-loaded post
      // read every time, including ones they've already read before, so this has to be cheap and
      // safe to call repeatedly without growing the list or writing anything when nothing's
      // actually new.
      if (existingReadBy.some((r) => r.id === readerId)) return posts;

      const nextReadBy = [...existingReadBy, { id: readerId, name: readerName, readAt: new Date().toISOString() }];
      const updated = posts.map((p) => (p.id === postId ? { ...p, readBy: nextReadBy } : p));
      tx.set(ref, { value: updated });
      return updated;
    });

    return res.status(200).json({ ok: true, posts: nextPosts });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err.message || "Something went wrong recording this." });
  }
}
