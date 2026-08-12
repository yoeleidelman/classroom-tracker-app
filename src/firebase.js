import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

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