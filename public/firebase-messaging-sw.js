// This file has to live at the site's root (not inside /public/js or similar) — a service
// worker can only control the scope it's served from, and the root is what covers the whole app.
//
// Right now this just registers cleanly so the app counts as installable. Firebase's messaging
// setup gets added here in the next phase — this file is deliberately named
// firebase-messaging-sw.js in advance since that's the path Firebase's SDK looks for by default,
// so nothing needs to be renamed or re-registered later.
 
self.addEventListener("install", () => {
  self.skipWaiting();
});
 
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
 