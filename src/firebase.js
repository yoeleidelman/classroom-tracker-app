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
 
// Messaging isn't available in every environment (older browsers, and some in-app browser
// contexts don't support it at all) — isSupported() checks first so an unsupported browser gets
// null back instead of a thrown error the rest of the app would need to guard against everywhere
// messaging is used.
export const messagingPromise = isSupported().then((supported) => (supported ? getMessaging(app) : null));