import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip, 60, 60 * 1000)) { // 60 requests per minute
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const targetCountry = searchParams.get('country') || 'global';
    const adUnitId = searchParams.get('adUnitId');
    const apiKey = searchParams.get('apiKey');
    const adType = searchParams.get('adType') || 'banner';
    const exclude = searchParams.get('exclude'); // ID of the last shown ad
    const bundleId = searchParams.get('bundleId'); // Optional from mobile SDKs
    const explicitSourceUrl = searchParams.get('sourceUrl'); // Explicitly passed by SDK
    const allowSelfAdsParam = searchParams.get('allowSelfAds'); // 'true' or 'false'

    // Determine the source tracking ID for evaluating blocklist
    const originHeader = explicitSourceUrl || reqHeaders.get('origin') || reqHeaders.get('referer') || '';
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

    let viewerUid: string | null = null;
    let publisherBlockedAds: string[] = [];
    if (apiKey) {
      const pSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
      if (!pSnap.empty) {
        viewerUid = pSnap.docs[0].id;
        const pData = pSnap.docs[0].data();
        publisherBlockedAds = pData?.blockedAdsByAppId?.[apiKey] || [];
      } else {
        const pSnapArr = await db.collection('users').where('apiKeys', 'array-contains', apiKey).limit(1).get();
        if (!pSnapArr.empty) {
          viewerUid = pSnapArr.docs[0].id;
          const pData = pSnapArr.docs[0].data();
          publisherBlockedAds = pData?.blockedAdsByAppId?.[apiKey] || [];
        }
      }
    }

    const externalAds: any[] = [];
    const selfAds: any[] = [];
    
    try {
      // 1. Fetch active ads
      const adsRef = db.collection('ads');
      const q = adsRef.where('active', '==', true);
      const querySnapshot = await q.get();
      
      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        
        // Filter strictly by ad type
        const adDataType = data.adType || 'banner';
        if (adDataType !== adType) {
          return;
        }

        // Skip ads that have blocked this origin
        if (data.blockedOrigins && data.blockedOrigins.includes(safeSourceId)) {
          return;
        }

        // Skip ads that the publisher has blocked for this App ID
        if (publisherBlockedAds.length > 0 && publisherBlockedAds.includes(doc.id)) {
          return;
        }

        const adTargetCountries = data.targetCountries 
          ? (Array.isArray(data.targetCountries) ? data.targetCountries : [data.targetCountries]) 
          : (data.targetCountry && data.targetCountry !== 'global' ? [data.targetCountry] : []);
          
        const isGlobalAd = adTargetCountries.length === 0 || adTargetCountries.includes('global');

        if (isGlobalAd || adTargetCountries.includes(targetCountry) || targetCountry === 'global') {
          // Check if it's a "self ad"
          // Criteria: owned by viewer OR destination matches source
          let isSelfAd = false;
          
          if (viewerUid && data.ownerUid === viewerUid) {
            isSelfAd = true;
          } else if (data.clickUrl && rawSource && rawSource !== 'unknown_origin') {
            try {
              const clickUrlObj = new URL(data.clickUrl);
              const clickHostname = clickUrlObj.hostname.toLowerCase();
              const sourceHostname = rawSource.toLowerCase();
              
              // Robust domain match: identical OR one is a subdomain of the other
              if (
                clickHostname === sourceHostname || 
                clickHostname.endsWith('.' + sourceHostname) || 
                sourceHostname.endsWith('.' + clickHostname)
              ) {
                isSelfAd = true;
              }
            } catch (e) {
              // Ignore URL parse errors
            }
          }

          if (isSelfAd) {
            selfAds.push({ id: doc.id, ...data, isSelfAd: true });
          } else {
            externalAds.push({ id: doc.id, ...data, isSelfAd: false });
          }
        }
      });
    } catch (dbError) {
      console.error('Database fetch failed:', dbError);
    }

    // 2. Selection Logic
    // Priority 2: Self ads (fallen back if no external ads available AND allowSelfAds is not false)
    let candidates = externalAds;
    if (candidates.length === 0 && allowSelfAdsParam !== 'false') {
      candidates = selfAds;
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No ads available' }, { status: 404, headers: corsHeaders });
    }

    // Select an ad, avoiding the 'exclude' one if possible
    let filteredCandidates = candidates;
    if (exclude && candidates.length > 1) {
      filteredCandidates = candidates.filter(ad => ad.id !== exclude);
    }
    
    const randomAd = filteredCandidates[Math.floor(Math.random() * filteredCandidates.length)];

    // 3. Create auth token for impressions/clicks
    const configSnap = await db.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    const API_SECRET_KEY = secretsData.API_SECRET || process.env.API_SECRET;

    if (!API_SECRET_KEY) {
      console.error('API_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
    const hmac = crypto.createHmac('sha256', API_SECRET_KEY);
    hmac.update(randomAd.id);
    const token = hmac.digest('hex');

    // 4. Return the selected ad
    return NextResponse.json(
      {
        id: randomAd.id,
        title: randomAd.title,
        description: randomAd.description,
        imageUrl: randomAd.imageUrl,
        clickUrl: randomAd.clickUrl,
        token,
        adType: randomAd.adType || 'banner',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error serving ad:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message, stack: error.stack }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
