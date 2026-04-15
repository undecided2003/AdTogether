const admin = require('firebase-admin');

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });
}

const db = admin.firestore();

async function run() {
  try {
    await db.collection('config').doc('secrets').set({
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      API_SECRET: process.env.API_SECRET
    }, { merge: true });
    console.log('✅ Secrets populated in Firestore');
  } catch (e) {
    console.error('❌ Failed to set secrets', e);
  } finally {
    process.exit(0);
  }
}

run();
