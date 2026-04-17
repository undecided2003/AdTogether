import admin from 'firebase-admin';

let app;
try {
  // This will throw if the [DEFAULT] app is not initialized
  app = admin.app();
} catch (e) {
  // Initialize the default app
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/^"(.*)"$/, '$1')
      .replace(/\\n/g, '\n');
      
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID.replace(/^"(.*)"$/, '$1'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL.replace(/^"(.*)"$/, '$1'),
        privateKey: privateKey,
      }),
    });
  } else {
    app = admin.initializeApp({
      projectId: 'adtogether-15453',
    });
  }
}

export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
