import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA4YZtvA9If1eXEgVbvc6dYOQC7lERgc-k",
  authDomain: "adtogether-15453.firebaseapp.com",
  projectId: "adtogether-15453",
  storageBucket: "adtogether-15453.firebasestorage.app",
  messagingSenderId: "971040864420",
  appId: "1:971040864420:web:e922ae983b2c188942ce31",
  measurementId: "G-447YE2Y9PD"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
