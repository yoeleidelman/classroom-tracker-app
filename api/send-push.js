import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// Takes a list of account uids (teacher or family — the same push-tokens:{uid} shape covers
// both) and a notification to send, looks up every device each of them has enabled, and sends to
// all of them at once. A token that FCM reports as dead (uninstalled, permission revoked, etc.)
// gets quietly removed from storage as part of the same call, so a stale device doesn't keep
// costing a failed send forever.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { uids, title, body, url, icon } = req.body || {};
  if (!Array.isArray(uids) || uids.length === 0) return res.status(400).json({ error: "uids must be a non-empty array." });
  if (!title || !body) return res.status(400).json({ error: "title and body are required." });

  try {
    const db = getFirestore();

    // Pulls every uid's token list in parallel, then flattens into one array while remembering
    // which uid and which position in that uid's own list each token came from — needed to write
    // the cleaned-up list back to the right document afterward.
    const perUidDocs = await Promise.all(
      uids.map((uid) => db.collection("data").doc(`push-tokens:${uid}`).get())
    );

    const allTokens = []; // flat list of every token about to be sent to
    const tokenOwners = []; // same length/order as allTokens — { uid, tokenIndex } for writing cleanup back
    perUidDocs.forEach((doc, i) => {
      const tokens = doc.exists ? (doc.data().value?.tokens || []) : [];
      tokens.forEach((t, tokenIndex) => {
        allTokens.push(t.token);
        tokenOwners.push({ uid: uids[i], tokenIndex });
      });
    });

    if (allTokens.length === 0) return res.status(200).json({ ok: true, sent: 0, note: "No registered devices for any of these accounts." });

    const messaging = getMessaging();
    const result = await messaging.sendEachForMulticast({
      tokens: allTokens,
      // Deliberately data-only, not a "notification" payload — a notification payload gets
      // auto-displayed by the browser AND by the explicit showNotification() call in the service
      // worker below, producing two separate notifications for the same message. Data-only means
      // only our own explicit call ever shows anything.
      data: {
        title,
        body,
        url: url || "/",
        icon: icon || "/icons-parent/icon-192.png",
      },
    });

    // Any token FCM rejects as no-longer-valid gets removed from its owner's stored list — grouped
    // by uid first so each affected document is only written once, not once per dead token.
    const deadIndexesByUid = {};
    result.responses.forEach((r, i) => {
      if (r.success) return;
      const code = r.error?.code || "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        const { uid, tokenIndex } = tokenOwners[i];
        deadIndexesByUid[uid] = deadIndexesByUid[uid] || [];
        deadIndexesByUid[uid].push(tokenIndex);
      }
    });

    await Promise.all(
      Object.entries(deadIndexesByUid).map(async ([uid, deadIndexes]) => {
        const doc = perUidDocs[uids.indexOf(uid)];
        const tokens = doc.data().value?.tokens || [];
        const kept = tokens.filter((_, idx) => !deadIndexes.includes(idx));
        await db.collection("data").doc(`push-tokens:${uid}`).set({ value: { tokens: kept } });
      })
    );

    return res.status(200).json({ ok: true, sent: result.successCount, failed: result.failureCount });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong sending the notification." });
  }
}