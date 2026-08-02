import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
