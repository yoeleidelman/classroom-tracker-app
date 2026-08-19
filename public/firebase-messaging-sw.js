importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

// Same config as your real src/firebase.js — a service worker runs in its own separate context
// with no access to your app's modules or imports, so it needs its own copy of this, not a
// shared one.
firebase.initializeApp({
  apiKey: "AIzaSyDP07Yo9gCUsQw5SO1B4bTshkZmHP-6xYQ",
  authDomain: "classroom-tracker-3cb28.firebaseapp.com",
  projectId: "classroom-tracker-3cb28",
  storageBucket: "classroom-tracker-3cb28.firebasestorage.app",
  messagingSenderId: "822542197252",
  appId: "1:822542197252:web:649dbe767af1fba792cb51",
});

const messaging = firebase.messaging();

// The app icon's own badge count, for the case this file exists specifically to handle — a push
// arriving while the app isn't open at all, where there's no React state anywhere to compute an
// accurate unread total from. A simple persisted counter, incremented here on each arrival: not a
// perfectly accurate running total (nothing here can know about messages marked read elsewhere,
// blog posts viewed on another device, etc.) but it doesn't need to be — the app's own badge
// logic recomputes the exact real count from its own genuinely current state the moment it's
// actually opened again, so this only ever needs to establish that something is unread, not
// exactly how much.
async function incrementBadgeCount() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("badge-store", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const current = await new Promise((resolve) => {
      const getReq = db.transaction("kv", "readonly").objectStore("kv").get("count");
      getReq.onsuccess = () => resolve(getReq.result || 0);
      getReq.onerror = () => resolve(0);
    });
    const next = current + 1;
    db.transaction("kv", "readwrite").objectStore("kv").put(next, "count");
    if ("setAppBadge" in navigator) await navigator.setAppBadge(next);
  } catch {
    // Best-effort — if the counter itself fails for any reason, still surface SOMETHING on the
    // icon rather than nothing at all; the app's own logic corrects the exact number on next open.
    try { if ("setAppBadge" in navigator) await navigator.setAppBadge(1); } catch { /* Badging API unavailable on this platform */ }
  }
}

// Fires when a push arrives while the app isn't the active tab (or isn't open at all) — this is
// the actual "device buzzes with a notification" moment. If the app IS open and in the
// foreground, this does NOT fire; that case is handled separately, in-app.
//
// Reads everything from payload.data, not payload.notification — the backend deliberately sends
// a data-only payload. A "notification" payload gets auto-displayed by the browser on its own, in
// addition to this handler's own showNotification() call below, which produced two separate
// notifications for every single message. Data-only means this call is the only thing that ever
// shows anything.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || "New notification";
  incrementBadgeCount();
  self.registration.showNotification(title, {
    body: payload.data?.body || "",
    // Both fields matter and serve genuinely different purposes, which is why removing one
    // caused a worse problem than the one it was meant to fix. "icon" is the field every browser
    // and Android version actually respects — omitting it is exactly what left some phones with
    // nothing to fall back on except a generated default (the meaningless "C"). "badge" is the
    // small, monochrome-masked status-bar treatment, but platform support for it varies far more
    // by device — it was never a safe standalone replacement for icon, only a complement to it.
    icon: "/icon-192.png",
    badge: "/icons-badge/badge-96.png",
    data: payload.data || {},
  });
});

// Tapping the notification itself — brings an already-open tab to the front AND navigates it to
// wherever the notification was actually about (a specific conversation, the blog, etc.), or opens
// a fresh window landed there if none was open. The critical piece this didn't used to do: an
// existing tab was only ever focused, never actually navigated anywhere — for anyone who keeps the
// app open most of the day (which is exactly the common case, not an edge case), that meant every
// single notification tap just brought whatever screen happened to already be showing to the
// front, unchanged, rather than ever landing on the specific thing that arrived. client.navigate()
// is what actually moves that existing tab to the right place; focus() alone was never enough on
// its own.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((navigated) => (navigated || client).focus());
          }
          // navigate() isn't available in every browser — still bringing the existing tab
          // forward is better than nothing, even on the platforms where this is as far as it can go.
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
