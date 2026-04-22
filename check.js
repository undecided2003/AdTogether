const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/(^['"]|['"]$)/g, '');
    }
  });
}

let app;
try {
  app = admin.app();
} catch (e) {
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

const db = admin.firestore();
async function run() {
  const doc = await db.collection('ads').doc('ncZlSJg3TanYY5ltzk2z').get();
  console.log('Ad ncZlSJg3TanYY5ltzk2z');
  console.log('title:', doc.data()?.title);
  console.log('description:', doc.data()?.description);
}
run().catch(console.error);
