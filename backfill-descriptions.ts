import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/(^['"]|['"]$)/g, '');
      process.env[key] = value;
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

async function backfill() {
  console.log("Starting backfill for adDescription...");
  
  // 1. Fetch all ads to get their descriptions
  const adsSnapshot = await db.collection("ads").get();
  const adDescriptions: Record<string, string> = {};
  
  adsSnapshot.forEach((doc: any) => {
    const data = doc.data();
    if (data.description) {
      adDescriptions[doc.id] = data.description;
    }
  });
  
  console.log(`Fetched ${Object.keys(adDescriptions).length} ad descriptions.`);

  // 2. Fetch all users
  const usersSnapshot = await db.collection("users").get();
  let updatedUsers = 0;

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    const earningsLog = userData.earningsLog;
    
    if (earningsLog) {
      let hasUpdates = false;
      
      for (const [key, entry] of Object.entries(earningsLog as Record<string, any>)) {
        if (!entry.adDescription) {
          const realAdId = entry.adId || key.split('_').pop();
          if (realAdId && adDescriptions[realAdId]) {
            entry.adDescription = adDescriptions[realAdId];
            hasUpdates = true;
          }
        }
      }
      
      if (hasUpdates) {
        await doc.ref.update({ earningsLog });
        updatedUsers++;
        console.log(`Updated user ${doc.id}`);
      }
    }
  }
  
  console.log(`Backfill complete. Updated ${updatedUsers} users.`);
}

backfill().catch(console.error);
