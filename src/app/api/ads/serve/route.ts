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
    const adType = searchParams.get('adType'); // 'banner' | 'interstitial' | null
    const exclude = searchParams.get('exclude'); // ID of the last shown ad
    const bundleId = searchParams.get('bundleId'); // Optional from mobile SDKs

    // Determine the source tracking ID for evaluating blocklist
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
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
    if (apiKey) {
      const pSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
      if (!pSnap.empty) {
        viewerUid = pSnap.docs[0].id;
      } else {
        const pSnapArr = await db.collection('users').where('apiKeys', 'array-contains', apiKey).limit(1).get();
        if (!pSnapArr.empty) {
          viewerUid = pSnapArr.docs[0].id;
        }
      }
    }

    const ads: any[] = [];
    
    try {
      // 1. Fetch active ads
      // Note: In a production environment with many ads, you would want to 
      // use more specific queries and potentially a more sophisticated 
      // selection algorithm based on weight/credits.
      const adsRef = db.collection('ads');
      const q = adsRef.where('active', '==', true);
      const querySnapshot = await q.get();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip ads owned by the viewer (if apiKey provided)
        if (viewerUid && data.ownerUid === viewerUid) {
          return;
        }

        // Filter by ad type if specified
        if (adType && data.adType && data.adType !== adType) {
          return;
        }

        // Skip ads that have blocked this origin
        if (data.blockedOrigins && data.blockedOrigins.includes(safeSourceId)) {
          return;
        }

        const adTargetCountries = data.targetCountries 
          ? (Array.isArray(data.targetCountries) ? data.targetCountries : [data.targetCountries]) 
          : (data.targetCountry && data.targetCountry !== 'global' ? [data.targetCountry] : []);
          
        const isGlobalAd = adTargetCountries.length === 0 || adTargetCountries.includes('global');

        if (isGlobalAd || adTargetCountries.includes(targetCountry) || targetCountry === 'global') {
          ads.push({ id: doc.id, ...data });
        }
      });
    } catch (dbError) {
      console.error('Database fetch failed:', dbError);
    }

    if (ads.length === 0) {
      return NextResponse.json({ error: 'No ads available' }, { status: 404, headers: corsHeaders });
    }

    // 2. Select an ad, avoiding the 'exclude' one if possible
    let candidates = ads;
    if (exclude && ads.length > 1) {
      candidates = ads.filter(ad => ad.id !== exclude);
    }
    
    const randomAd = candidates[Math.floor(Math.random() * candidates.length)];

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
