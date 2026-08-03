import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBC7FvlER50KVbJLxlYoUv9cdc_YSmTfmQ",
  authDomain: "tutoria-97938.firebaseapp.com",
  projectId: "tutoria-97938",
  storageBucket: "tutoria-97938.firebasestorage.app",
  messagingSenderId: "604428154960",
  appId: "1:604428154960:web:1b1b2ede91f1fb47b5f955",
  measurementId: "G-BH3152SMR5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Forzar LocalStorage en lugar de IndexedDB para iPad/Android estrictos (ya no es necesaria por ngrok)
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.error("Error setting persistence", err),
);
