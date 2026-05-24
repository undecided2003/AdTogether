import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// For signInWithRedirect to work, authDomain MUST match the app's origin.
// Modern browsers block cross-origin storage access, so getRedirectResult()
// can't read credentials stored by a different-origin auth handler.
// On localhost, Next.js rewrites proxy /__/auth/* to Firebase (see next.config.ts).
// On production (Firebase Hosting), /__/auth/* is served natively.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: typeof window !== "undefined"
    ? window.location.hostname
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize App Check on the client side
let appCheck;
if (typeof window !== "undefined") {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || "6LcOmMYsAAAAAA0s8tJu8KoLkdaU_qKWraWGppgl"
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

export { appCheck };
