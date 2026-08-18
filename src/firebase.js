import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";
 
const firebaseConfig = {
  apiKey: "AIzaSyDP07Yo9gCUsQw5SO1B4bTshkZmHP-6xYQ",
  authDomain: "classroom-tracker-3cb28.firebaseapp.com",
  projectId: "classroom-tracker-3cb28",
  storageBucket: "classroom-tracker-3cb28.firebasestorage.app",
  messagingSenderId: "822542197252",
  appId: "1:822542197252:web:649dbe767af1fba792cb51"
};
 
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Registered unconditionally, on load, independent of whether anyone's signed in yet. Chrome
// weighs an active service worker registration as one of its own signals for whether a site is
// genuinely installable — this used to only happen much later, the first time a signed-in account
// actually tried to enable notifications (deep inside Firebase's own getToken() call, triggered
// from enableNotificationsFor, which requires a uid). That meant a real PWA install could be
// unavailable or unreliable for anyone who hadn't signed in yet, on some Android/Chrome
// combinations — registering it here instead puts it in place from the very first page load,
// before any sign-in screen, matching what the manifest tags in index.html already do.
// Deliberately just navigator.serviceWorker.register() — nothing about notification PERMISSION
// happens here, and no dialog appears from this alone; requesting permission is still only ever
// triggered by an explicit tap on the notification toggle, exactly as before. Safe to call even
// though enableNotificationsFor's own getToken() may end up finding this same registration later —
// registering the same script/scope twice is a no-op that returns the existing registration, not
// a duplicate.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
    // Best-effort — if this fails for any reason, the existing notification-enabling flow still
    // registers it itself the first time it's actually needed, same as it always has.
  });
}
 
// Messaging isn't available in every environment (older browsers, and some in-app browser
// contexts don't support it at all) — isSupported() checks first so an unsupported browser gets
// null back instead of a thrown error the rest of the app would need to guard against everywhere
// messaging is used.
export const messagingPromise = isSupported().then((supported) => (supported ? getMessaging(app) : null));
