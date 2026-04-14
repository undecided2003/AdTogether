import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  // Try to use environment variables for service account if available
  // otherwise fallback to application default credentials
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/^"(.*)"$/, '$1') // Remove surrounding quotes if they exist
      .replace(/\\n/g, '\n');
      
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID.replace(/^"(.*)"$/, '$1'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL.replace(/^"(.*)"$/, '$1'),
        privateKey: privateKey,
      }),
    });
  } else {
    initializeApp({
      projectId: 'adtogether-15453',
    });
  }
}

export const adminDb = getFirestore();
