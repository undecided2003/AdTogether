#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const admin = require('firebase-admin');
require('@next/env').loadEnvConfig(process.cwd());

const CREDIT_AUTO_RESUME_THRESHOLD = 25;
const DEFAULT_PROJECT_ID = 'adtogether-15453';
const DEFAULT_REVIEW_FILE = path.join(process.cwd(), 'credit-auto-resume-review.json');

function initializeFirebase() {
  if (!admin.apps.length) {
    const projectId = (process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID).replace(/^"(.*)"$/, '$1');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"(.*)"$/, '$1');
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/^"(.*)"$/, '$1')
      .replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      admin.initializeApp({
        projectId,
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      admin.initializeApp({
        projectId,
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return admin.firestore();
}

function parseArgs(argv) {
  const args = [...argv];
  const applyIndex = args.indexOf('--apply');
  if (applyIndex !== -1) {
    const reviewPath = args[applyIndex + 1];
    if (!reviewPath || reviewPath.startsWith('--')) {
      throw new Error('Usage: node scripts/backfill-credit-auto-resume.cjs --apply <review-file.json>');
    }
    return { mode: 'apply', reviewPath: path.resolve(reviewPath) };
  }

  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex === -1
    ? DEFAULT_REVIEW_FILE
    : path.resolve(args[outputIndex + 1] || '');
  if (outputIndex !== -1 && !args[outputIndex + 1]) {
    throw new Error('The --output option requires a file path.');
  }

  return { mode: 'dry-run', outputPath };
}

function timestampParts(timestamp) {
  return timestamp ? { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds } : null;
}

async function runDryRun(db, outputPath) {
  const eligibleUsers = await db.collection('users')
    .where('credits', '>=', CREDIT_AUTO_RESUME_THRESHOLD)
    .get();

  const candidates = [];
  const concurrency = 10;
  for (let start = 0; start < eligibleUsers.docs.length; start += concurrency) {
    const userBatch = eligibleUsers.docs.slice(start, start + concurrency);
    const campaignGroups = await Promise.all(userBatch.map(async (userSnap) => {
      const userData = userSnap.data();
      const adsSnapshot = await db.collection('ads')
        .where('ownerUid', '==', userSnap.id)
        .get();
      const pausedCampaigns = adsSnapshot.docs
        .filter((adSnap) => adSnap.data().active === false)
        .map((adSnap) => {
          const adData = adSnap.data();
          return {
            adId: adSnap.id,
            title: adData.title || '',
            adType: adData.adType || 'banner',
            autoPausedReason: adData.autoPausedReason || null,
            manuallyPaused: adData.manuallyPaused === true,
            updateTime: timestampParts(adSnap.updateTime),
          };
        });

      if (pausedCampaigns.length === 0) return null;
      return {
        uid: userSnap.id,
        credits: Number(userData.credits) || 0,
        campaigns: pausedCampaigns,
      };
    }));

    candidates.push(...campaignGroups.filter(Boolean));
  }

  const report = {
    projectId: admin.app().options.projectId || DEFAULT_PROJECT_ID,
    generatedAt: new Date().toISOString(),
    threshold: CREDIT_AUTO_RESUME_THRESHOLD,
    note: 'selectedAdIds includes campaigns not marked manuallyPaused. Remove any IDs you do not want resumed before applying. Older records without the marker are treated as unmarked.',
    selectedAdIds: candidates.flatMap((user) => user.campaigns
      .filter((campaign) => campaign.manuallyPaused !== true)
      .map((campaign) => campaign.adId)),
    candidateUserCount: candidates.length,
    candidateCampaignCount: candidates.reduce((sum, user) => sum + user.campaigns.length, 0),
    candidates,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Project: ${report.projectId}`);
  console.log(`Current balance threshold: ${CREDIT_AUTO_RESUME_THRESHOLD} credits`);
  console.log(`Eligible users with paused campaigns: ${report.candidateUserCount}`);
  console.log(`Paused campaign candidates: ${report.candidateCampaignCount}`);
  console.log(`Review file: ${outputPath}`);
  console.log('No Firestore documents were changed.');
}

async function runApply(db, reviewPath) {
  const report = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
  const projectId = admin.app().options.projectId || DEFAULT_PROJECT_ID;
  if (report.projectId !== projectId) {
    throw new Error(`Review file targets ${report.projectId}; current Firebase project is ${projectId}.`);
  }
  if (report.threshold !== CREDIT_AUTO_RESUME_THRESHOLD) {
    throw new Error(`Review file threshold ${report.threshold} does not match current threshold ${CREDIT_AUTO_RESUME_THRESHOLD}.`);
  }

  const selectedAdIds = [...new Set(report.selectedAdIds || [])];
  if (selectedAdIds.length === 0) {
    throw new Error('No campaigns selected. Add reviewed ad IDs to selectedAdIds in the review file.');
  }

  const candidateByAdId = new Map();
  for (const user of report.candidates || []) {
    for (const campaign of user.campaigns || []) {
      candidateByAdId.set(campaign.adId, { user, campaign });
    }
  }

  const results = [];
  for (const adId of selectedAdIds) {
    const candidate = candidateByAdId.get(adId);
    if (!candidate) {
      results.push({ adId, result: 'skipped_not_in_review_file' });
      continue;
    }

    const adRef = db.collection('ads').doc(adId);
    const userRef = db.collection('users').doc(candidate.user.uid);
    const result = await db.runTransaction(async (transaction) => {
      const adSnap = await transaction.get(adRef);
      if (!adSnap.exists) return 'skipped_campaign_missing';

      const adData = adSnap.data();
      if (adData.ownerUid !== candidate.user.uid) return 'skipped_owner_changed';
      if (adData.active !== false) return 'skipped_campaign_no_longer_paused';
      if (adData.manuallyPaused === true) return 'skipped_manual_pause';

      const currentUpdateTime = timestampParts(adSnap.updateTime);
      if (
        !candidate.campaign.updateTime ||
        currentUpdateTime.seconds !== candidate.campaign.updateTime.seconds ||
        currentUpdateTime.nanoseconds !== candidate.campaign.updateTime.nanoseconds
      ) {
        return 'skipped_campaign_changed_since_review';
      }

      const userSnap = await transaction.get(userRef);
      const currentCredits = Number(userSnap.data()?.credits) || 0;
      if (!userSnap.exists || currentCredits < CREDIT_AUTO_RESUME_THRESHOLD) {
        return 'skipped_balance_below_threshold';
      }

      transaction.update(adRef, {
        active: true,
        autoPausedReason: null,
        manuallyPaused: false,
        creditBackfillResumedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return 'resumed';
    });

    results.push({ adId, result });
  }

  console.log(JSON.stringify({ projectId, threshold: CREDIT_AUTO_RESUME_THRESHOLD, results }, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = initializeFirebase();

  if (options.mode === 'apply') {
    await runApply(db, options.reviewPath);
  } else {
    await runDryRun(db, options.outputPath);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
