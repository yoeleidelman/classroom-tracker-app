// api/verify-substitute-code.js
// A substitute has no account of their own, so this can't require a login the way the other
// endpoints now do — this IS the login. It takes a code, checks it server-side against the real
// class registry (bypassing Firestore rules entirely, safely, since this runs with admin
// credentials on the server, never in the browser), and if it matches an active class's code,
// mints a real but narrowly-scoped Firebase sign-in: a custom token carrying a substituteClassId
// claim for exactly that one class, nothing else. The Firestore rules check that claim directly,
// so access is enforced by the database itself, not by which screens the app happens to show.
//
// This replaces the old mechanism, which checked the code against schoolClasses read directly in
// the browser — that only ever worked because schoolClasses used to be readable before signing
// in, which was itself a real vulnerability (every class's plaintext password was exposed to
// anyone, logged in or not) that got fixed as part of this security pass. This is the correct
// replacement: the verification now happens on the server, where the real class list can safely
// be read without exposing it to a signed-out browser.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const code = (req.body?.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "A code is required." });

  try {
    const db = getFirestore();
    const doc = await db.collection("data").doc("schoolClasses").get();
    const classes = doc.exists ? (doc.data().value || []) : [];
    const match = classes.find((c) => !c.archived && c.subCode && c.subCode.toUpperCase() === code);
    if (!match) return res.status(404).json({ error: "That code wasn't recognized. Double-check it and try again." });

    // One stable, dedicated identity per class for substitute sessions — reused every time
    // anyone subs for this class, rather than minting a fresh account per use. It carries no
    // name, email, or password of its own; it exists purely to hold this one custom claim.
    const auth = getAuth();
    const substituteUid = `substitute-${match.id}`;
    try {
      await auth.getUser(substituteUid);
    } catch {
      await auth.createUser({ uid: substituteUid });
    }
    await auth.setCustomUserClaims(substituteUid, { substituteClassId: match.id });

    const token = await auth.createCustomToken(substituteUid, { substituteClassId: match.id });
    return res.status(200).json({ ok: true, token, classId: match.id, className: match.name });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong checking that code." });
  }
}