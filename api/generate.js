// api/generate.js
// The one piece that holds the Anthropic API key safely — runs on Vercel's servers, never in the
// browser, so the key itself is never visible to anyone visiting the site. Every AI-assist feature
// in the app (drafting messages, reports, etc.) sends its request here instead of to Anthropic
// directly.
//
// SECURITY: this used to forward any request body straight through to Anthropic with no check on
// who was asking — anyone who found this URL could use it as a free, unlimited proxy billed
// entirely to the school's own API key. Every request must now prove it comes from a signed-in,
// active teacher or family account (AI-assist is used from both the teacher and parent sides of
// messaging, so this isn't limited to one role).
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

async function requireActiveAccount(req) {
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
  const teacherActive = teacherDoc.exists && teacherDoc.data().value?.active !== false;
  const familyActive = familyDoc.exists && familyDoc.data().value?.active !== false;
  if (!teacherActive && !familyActive) throw { status: 403, message: "Account not recognized." };
  return decoded;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireActiveAccount(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}