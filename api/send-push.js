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
// ---- Daily Tehillim reminders (called by Vercel's scheduler, see vercel.json "crons") ----
// This NEVER sends anything to parents. It only reminds staff: (1) the day after a real cycle is created, the
// teachers of any class that has not confirmed yet; (2) on the Friday before Shabbos Mevarchim, once it is 9 AM
// Pacific or later, the office, but only if the notice has not been sent yet. Each reminder is logged so a
// second run the same day (the schedule fires twice to cover daylight saving) never repeats it. Test cycles
// are ignored here entirely.
function laNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}
function addDaysStr(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function pushToUids(db, uids, title, body, url) {
  const docs = await Promise.all(uids.map((uid) => db.collection("data").doc(`push-tokens:${uid}`).get()));
  const tokens = [];
  docs.forEach((doc) => { if (doc.exists) (doc.data().value?.tokens || []).forEach((t) => tokens.push(t.token)); });
  if (tokens.length === 0) return 0;
  const result = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title, body, url: url || "/", icon: "/icons-parent/icon-192.png" },
    webpush: { headers: { Urgency: "high" } },
  });
  return result.successCount;
}
// Same launch letter the app uses (shown to parents in the first month only).
const TEHILLIM_INTRO_LETTER = `Dear Parents,

We are excited to introduce the Shabbos Mevarchim Tehillim Program.

The last Shabbos of each Hebrew month is Shabbos Mevarchim, when it is customary to read Tehillim. Each month your child's teacher sets a personal quota matched to their reading level.

Here is how it works: on the Friday before Shabbos Mevarchim you get a notification with your child's quota. Your child reads over the weekend (Friday–Sunday). You check it off in the app by Monday at 12:00 noon. Every child who finishes enters a school-wide raffle, drawn Monday afternoon.

Quotas start small and grow monthly. There is no penalty for missing a month. Questions or quota adjustments — please contact your child's teacher.

Warm regards,
Rabbi Eidelman`;

// Pacific wall-clock time on a date, as a real instant (ISO), correct across daylight saving.
function laTimeToISO(dateStr, hhmm) {
  const probe = new Date(`${dateStr}T20:00:00Z`);
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value || "GMT-8";
  const m = part.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offset = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : -480;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - offset * 60000).toISOString();
}
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Same rule as the app: Shabbos Mevarchim = last Shabbos strictly before the first day of Rosh Chodesh.
async function nextMevarchim(todayStr) {
  const { HebrewCalendar } = await import("@hebcal/core");
  const [y, m, d] = todayStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const groups = [];
  for (const ev of HebrewCalendar.calendar({ start: new Date(y, m - 1, d - 10), end: new Date(y, m - 1, d + 70) })) {
    const desc = ev.getDesc();
    if (!desc.startsWith("Rosh Chodesh")) continue;
    const g = ev.getDate().greg();
    g.setHours(0, 0, 0, 0);
    const last = groups[groups.length - 1];
    if (last && last.desc === desc && g - last.lastDate <= 36 * 3600 * 1000) { last.lastDate = g; last.hyear = ev.getDate().getFullYear(); }
    else groups.push({ desc, date: g, lastDate: g, hyear: ev.getDate().getFullYear(), monthName: desc.replace("Rosh Chodesh ", "") });
  }
  const out = [];
  for (const info of groups) {
    const sat = new Date(info.date);
    sat.setDate(sat.getDate() - 1);
    while (sat.getDay() !== 6) sat.setDate(sat.getDate() - 1);
    if (sat >= start) out.push({ shabbosDate: isoLocal(sat), hebrewMonth: `${info.monthName} ${info.hyear}` });
  }
  out.sort((a, b) => (a.shabbosDate < b.shabbosDate ? -1 : 1));
  return out[0] || null;
}
async function runTehillimReminders(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Not authorized." });
  }
  const db = getFirestore();
  const { date: today, hour } = laNow();
  if (hour < 9) return res.status(200).json({ ok: true, skipped: "before 9 AM Pacific" });

  const cyclesDoc = await db.collection("data").doc("tehillim:cycles").get();
  const cycles = cyclesDoc.exists ? (cyclesDoc.data().value || []) : [];
  const logRef = db.collection("data").doc("tehillim:reminder-log");
  const logDoc = await logRef.get();
  const log = logDoc.exists ? (logDoc.data().value || {}) : {};
  const done = [];

  // (0) From Tuesday of Shabbos Mevarchim week, start this month's cycle for every real Tehillim program that
  // does not have one yet, and alert the class teachers. (Test programs are left to the app itself.)
  try {
    const next = await nextMevarchim(today);
    if (next && today >= addDaysStr(next.shabbosDate, -4) && today < next.shabbosDate) {
      const progDoc = await db.collection("data").doc("programs").get();
      const classesDoc = await db.collection("data").doc("schoolClasses").get();
      const programs = (progDoc.exists ? progDoc.data().value || [] : []).filter((p) => p.programType === "tehillim");
      const classes = classesDoc.exists ? classesDoc.data().value || [] : [];
      for (const prog of programs) {
        const classIds = prog.memberClassIds || [];
        if (classIds.length === 0) continue;
        if (classIds.every((id) => /^\s*ZZZ/i.test(classes.find((c) => c.id === id)?.name || ""))) continue;
        const id = `auto-${prog.id}-${next.shabbosDate}`;
        if (cycles.some((c) => c.id === id || (c.programId === prog.id && c.shabbosDate === next.shabbosDate))) continue;
        const firstOne = !cycles.some((c) => c.programId === prog.id && c.parentNotifiedAt && !c.testMode);
        cycles.push({
          id, programId: prog.id, hebrewMonth: next.hebrewMonth, shabbosDate: next.shabbosDate,
          checkoffDeadline: laTimeToISO(addDaysStr(next.shabbosDate, 2), "12:00"), classIds,
          winnersCount: 3, prizeDescription: "", testMode: false, introLetter: firstOne ? TEHILLIM_INTRO_LETTER : "",
          status: "confirming", createdAt: new Date().toISOString(), createdBy: "Automatic", auto: true,
        });
        await db.collection("data").doc("tehillim:cycles").set({ value: cycles });
        const snap = await db.collection("data").where("value.role", "in", ["teacher", "admin"]).get();
        const uids = new Set();
        snap.forEach((doc) => { const t = doc.data().value; if (t && t.active !== false && t.uid && doc.id.startsWith("teacher:") && (t.assignedClassIds || []).some((cid) => classIds.includes(cid))) uids.add(t.uid); });
        const sent = uids.size ? await pushToUids(db, [...uids], "Set this month's Tehillim quota", "Takes about a minute. Your grade's starting numbers are already filled in.", "/") : 0;
        done.push({ cycle: id, kind: "auto-start", sent });
      }
    }
  } catch (err) { done.push({ kind: "auto-start-failed", error: err.message }); }

  for (const c of cycles) {
    if (c.testMode || c.parentNotifiedAt || c.lockedAt || c.paused) continue;
    const friday = addDaysStr(c.shabbosDate, -1);

    // (2) Friday: remind the office that the notice has not gone out.
    if (today === friday) {
      const key = `${c.id}:office:${today}`;
      if (!log[key]) {
        let confirmed = 0;
        for (const classId of c.classIds || []) {
          const d = await db.collection("data").doc(`tehillim:${c.id}:confirm:${classId}`).get(); // eslint-disable-line no-await-in-loop
          if (d.exists) confirmed += 1;
        }
        const snap = await db.collection("data").where("value.role", "==", "admin").get();
        const adminUids = [];
        snap.forEach((doc) => { const t = doc.data().value; if (t && t.active !== false && t.uid && doc.id.startsWith("teacher:")) adminUids.push(t.uid); });
        const sent = await pushToUids(db, adminUids, "Tehillim has not been sent yet", `Tap to review and send to parents. ${confirmed} of ${(c.classIds || []).length} classes confirmed; the rest will use the grade default.`, "/");
        log[key] = new Date().toISOString();
        done.push({ cycle: c.id, kind: "office", sent });
      }
    }

    // (1) The day after the cycle was created: nudge teachers who have not confirmed.
    const createdDay = c.createdAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(c.createdAt)) : null;
    if (createdDay && today === addDaysStr(createdDay, 1) && today < friday) {
      const key = `${c.id}:teachers:${today}`;
      if (!log[key]) {
        const snap = await db.collection("data").where("value.role", "in", ["teacher", "admin"]).get();
        const uids = new Set();
        for (const classId of c.classIds || []) {
          const d = await db.collection("data").doc(`tehillim:${c.id}:confirm:${classId}`).get(); // eslint-disable-line no-await-in-loop
          if (d.exists) continue;
          snap.forEach((doc) => { const t = doc.data().value; if (t && t.active !== false && t.uid && doc.id.startsWith("teacher:") && (t.assignedClassIds || []).includes(classId)) uids.add(t.uid); });
        }
        const sent = uids.size ? await pushToUids(db, [...uids], "Reminder: Tehillim quota", "Please confirm this month's Tehillim quota. It takes about a minute.", "/") : 0;
        log[key] = new Date().toISOString();
        done.push({ cycle: c.id, kind: "teachers", sent });
      }
    }
  }

  if (done.length) await logRef.set({ value: log });
  return res.status(200).json({ ok: true, today, hour, done });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try { return await runTehillimReminders(req, res); } catch (err) { return res.status(500).json({ error: err.message || "Reminder run failed." }); }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireActiveAccount(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Not authorized." });
  }

  const { uids: providedUids, resolve, title, body, url, icon, readGuard } = req.body || {};
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
        // Optional — { readStateKey, timestamp } — see sendPushNotification's own comment on the
        // client side for what this exists to fix. Firebase's data payload only carries strings,
        // so this is flattened into two separate fields rather than sent as a nested object; the
        // service worker reads them back out individually.
        ...(readGuard ? { readStateKey: readGuard.readStateKey, readGuardTimestamp: readGuard.timestamp } : {}),
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