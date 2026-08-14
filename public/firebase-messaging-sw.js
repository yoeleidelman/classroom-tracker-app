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
  self.registration.showNotification(title, {
    body: payload.data?.body || "",
    // No "icon" field here on purpose — that's the larger image shown next to the notification
    // text, separate from "badge" below. On several Android phones the OS already shows its own
    // icon or the badge itself on the left of a notification, so adding a second, larger icon on
    // the right just looks like a duplicate. "badge" alone is what every other well-behaved app
    // (WhatsApp, Mail, etc.) relies on for this.
    badge: "/icons-badge/badge-96.png",
    data: payload.data || {},
  });
});

// Tapping the notification itself — brings an already-open tab to the front instead of opening a
// duplicate one, and otherwise opens a fresh one landed on whatever page the notification was
// actually about (a specific conversation, the blog, etc.), once that targeting is wired up.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});