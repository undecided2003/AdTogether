import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCountryTier, getTierMultiplier } from '@/lib/country-tiers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';
    const ipCountry = reqHeaders.get('x-vercel-ip-country') || null;
    
    // Extract origin for web tracking
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    
    if (!checkRateLimit(ip, 200, 60 * 1000)) { // 200 requests per minute
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const { adId, token, apiKey, bundleId, country } = await request.json();
    
    const finalCountry = country || ipCountry;
    const tier = getCountryTier(finalCountry);
    const tierMultiplier = getTierMultiplier(tier);

    if (!adId) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400, headers: corsHeaders });
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Auth token is required' }, { status: 401, headers: corsHeaders });
    }

    // Determine the source tracking ID
    let rawSource = bundleId;
    if (!rawSource && originHeader) {
      try {
        const urlObj = new URL(originHeader.startsWith('http') ? originHeader : `https://${originHeader}`);
        rawSource = urlObj.hostname;
      } catch (e) {
        rawSource = originHeader;
      }
    }
    const safeSourceId = (rawSource || 'unknown_origin').replace(/\./g, '_').replace(/\//g, '_').substring(0, 50);

    const configSnap = await db.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    const API_SECRET_KEY = secretsData.API_SECRET || process.env.API_SECRET;

    if (!API_SECRET_KEY) {
      console.error('API_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
    const hmac = crypto.createHmac('sha256', API_SECRET_KEY);
    hmac.update(adId);
    const expectedToken = hmac.digest('hex');

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 403, headers: corsHeaders });
    }

    let publisherRef: FirebaseFirestore.DocumentReference | null = null;
    if (apiKey) {
      const pSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
      if (!pSnap.empty) {
        publisherRef = pSnap.docs[0].ref;
      } else {
        const pSnapArr = await db.collection('users').where('apiKeys', 'array-contains', apiKey).limit(1).get();
        if (!pSnapArr.empty) {
          publisherRef = pSnapArr.docs[0].ref;
        }
      }
    }

    const adRef = db.collection('ads').doc(adId);
    let outOfCredits = false;

    // Use runTransaction to safely process impression and deduct/add credits
    await db.runTransaction(async (transaction) => {
      // 1. ALL READS FIRST
      const adSnap = await transaction.get(adRef);
      if (!adSnap.exists) {
        throw new Error('Ad not found');
      }

      const adData = adSnap.data();
      if (!adData) throw new Error('Ad data missing');
      
      const ownerUid = adData.ownerUid;
      const adType = adData.adType || 'banner';
      
      const baseCost = adType === 'interstitial' ? 5 : 1;
      const creditCost = baseCost * tierMultiplier;

      let userSnap = null;
      let userRef = null;
      if (ownerUid) {
        userRef = db.collection('users').doc(ownerUid);
        userSnap = await transaction.get(userRef);
      }

      let pSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (publisherRef) {
        pSnap = await transaction.get(publisherRef);
      }

      // 2. ALL WRITES AFTER READS
      // Increment ad impressions
      const currentImpressions = adData.impressions || 0;
      
      // Track origins
      const originsMap = adData.origins || {};
      const currentSourceCount = originsMap[safeSourceId] || 0;
      originsMap[safeSourceId] = currentSourceCount + 1;

      transaction.update(adRef, { 
        impressions: currentImpressions + 1,
        origins: originsMap
      });

      if (userSnap && userSnap.exists && userRef) {
        const userData = userSnap.data();
        if (userData) {
          const currentCredits = userData.credits || 0;

          if (currentCredits <= -5) {
            // No credits left (and hit the negative limit), deactivate ad and don't deduct
            transaction.update(adRef, { active: false });
            outOfCredits = true;
          } else {
            // Deduct safely
            transaction.update(userRef, { credits: currentCredits - creditCost });
            if (currentCredits - creditCost <= -5) {
              transaction.update(adRef, { active: false });
            }
          }
        }
      }

      if (pSnap && pSnap.exists && publisherRef) {
        const pData = pSnap.data();
        if (pData) {
           const pCredits = pData.credits || 0;
           
           // Build earnings log entry for publisher visibility
           const earningsLog = pData.earningsLog || {};
           const logKey = adId;
           const existing = earningsLog[logKey] || {};
           earningsLog[logKey] = {
             adTitle: adData.title || 'Unknown Campaign',
             adImageUrl: adData.imageUrl || '',
             adType: adType,
             apiKey: apiKey || '',
             impressions: (existing.impressions || 0) + 1,
             clicks: existing.clicks || 0,
             creditsEarned: (existing.creditsEarned || 0) + creditCost,
             lastUpdated: new Date().toISOString(),
           };
           
           transaction.update(publisherRef, { credits: pCredits + creditCost, earningsLog });
        }
      }
    });

    if (outOfCredits) {
      return NextResponse.json(
        { error: 'Ad owner has insufficient credits' },
        { status: 402, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    if (error.message === 'Ad not found') {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404, headers: corsHeaders });
    }
    console.error('Error tracking impression:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
