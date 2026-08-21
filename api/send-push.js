import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

// SECURITY: this used to accept any uids array with no check on who was asking — anyone who
// found this URL could push an arbitrary notification, with an arbitrary link, to any real
// account's devices. Every request must now prove it comes from a signed-in, active teacher or
// family account (notifications legitimately flow from both directions — a teacher posting a
// blog update, a family messaging the office — so this isn't limited to one role).
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

// Takes a list of account uids (teacher or family — the same push-tokens:{uid} shape covers
// both) and a notification to send, looks up every device each of them has enabled, and sends to
// all of them at once. A token that FCM reports as dead (uninstalled, permission revoked, etc.)
// gets quietly removed from storage as part of the same call, so a stale device doesn't keep
// costing a failed send forever.
//
// uids can ALSO be resolved server-side instead of passed in directly, via an optional `resolve`
// field — { type: "classTeachers", classId } or { type: "familyGroup", groupId }. This exists
// because the client-side lookups these two cases used to depend on (loadAllWithPrefix over every
// teacher or family record) can never work as a genuine client-side query for a non-admin caller:
// the rule that grants a regular teacher access to a family record depends on that family's own
// linkedClassIds field, and Firestore can only prove a QUERY safe when the rule doesn't depend on
// each individual result's own content — reading one such document at a time is fine under that
// same rule, but listing many of them at once never validates, no matter how the rule is phrased.
// A family has no rules-based access to teacher:* records at all, for the same underlying reason.
// Resolving server-side sidesteps this entirely, since the Admin SDK isn't subject to these rules.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveAccount(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const { uids: providedUids, resolve, title, body, url, icon } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "title and body are required." });

  const db = getFirestore();

  let uids = providedUids;
  if (resolve?.type === "classTeachers" && resolve.classId) {
    const snapshot = await db.collection("data").where("value.role", "in", ["teacher", "admin"]).get();
    uids = [];
    snapshot.forEach((doc) => {
      const t = doc.data().value;
      if (t && t.active !== false && (t.assignedClassIds || []).includes(resolve.classId)) uids.push(t.uid);
    });
  } else if (resolve?.type === "familyGroup" && resolve.groupId) {
    const snapshot = await db.collection("data").where("value.familyGroupId", "==", resolve.groupId).get();
    uids = [];
    snapshot.forEach((doc) => {
      if (!doc.id.startsWith("family:")) return;
      const f = doc.data().value;
      if (f) uids.push(f.uid);
    });
    // A lone guardian's own account may not have familyGroupId set to anything other than their
    // own uid — the field defaults to their own uid at creation, but this covers it explicitly
    // in case that group id IS just a bare uid with no separate family record carrying it.
    if (uids.length === 0) uids = [resolve.groupId];
  }

  if (!Array.isArray(uids) || uids.length === 0) return res.status(400).json({ error: "uids must be a non-empty array." });

  try {
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
      // Every device this app registers is a Web Push token (obtained via the service worker and
      // a VAPID key), never a native Android or iOS app token — so this is the one delivery-speed
      // setting that actually applies here. Without it, a push defaults to normal urgency, which
      // both Android and iOS are free to sit on for minutes at a time to conserve battery,
      // especially once the screen's been off a while — a real, reported delay, not a theoretical
      // one. "high" is the maximum level the Web Push standard (RFC 8030) defines, telling the
      // browser and OS to wake the device and deliver this right away instead of batching it in
      // with other, less time-sensitive background traffic.
      webpush: {
        headers: { Urgency: "high" },
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