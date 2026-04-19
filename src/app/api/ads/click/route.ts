import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db, FieldValue } from '@/lib/firebase-admin';
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

export async function POST(request: Request) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';
    
    // Extract origin for web tracking
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    
    if (!checkRateLimit(ip, 100, 60 * 1000)) { // 100 requests per minute
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const { adId, token, bundleId, apiKey, environment } = await request.json();

    // Ignore local test traffic
    if (environment === 'development' || environment === 'test') {
      return NextResponse.json({ success: true, warning: 'ignored_test_traffic' }, { status: 200, headers: corsHeaders });
    }

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

    // Increment click count on the ad document for analytics
    const adRef = db.collection('ads').doc(adId);
    await adRef.update({ 
      clicks: FieldValue.increment(1),
      [`clicksByOrigin.${safeSourceId}`]: FieldValue.increment(1),
      [`lastClickedByOrigin.${safeSourceId}`]: new Date().toISOString()
    }).catch(console.error);

    // Update publisher's earnings log with click count
    if (apiKey) {
      let publisherRef: any = null;
      const pSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
      if (!pSnap.empty) {
        publisherRef = pSnap.docs[0].ref;
      } else {
        const pSnapArr = await db.collection('users').where('apiKeys', 'array-contains', apiKey).limit(1).get();
        if (!pSnapArr.empty) {
          publisherRef = pSnapArr.docs[0].ref;
        }
      }
      if (publisherRef) {
        const pubDoc = await publisherRef.get();
        const pubData = pubDoc.data();
        if (pubData) {
          const earningsLog = pubData.earningsLog || {};
          const logKey = apiKey ? `${apiKey}_${adId}` : adId;
          const actualKey = earningsLog[logKey] ? logKey : (earningsLog[adId] ? adId : logKey);
          
          if (earningsLog[actualKey]) {
            earningsLog[actualKey].clicks = (earningsLog[actualKey].clicks || 0) + 1;
            earningsLog[actualKey].lastUpdated = new Date().toISOString();
            await publisherRef.update({ earningsLog });
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
