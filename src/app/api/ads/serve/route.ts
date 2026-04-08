import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';
import crypto from 'crypto';

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
    const { searchParams } = new URL(request.url);
    const targetCountry = searchParams.get('country') || 'global';

    // 1. Fetch active ads
    const adsRef = db.collection('ads');
    // Using a simpler query to ensure it works without complex composite indexes initially
    const q = adsRef.where('active', '==', true);
    
    const querySnapshot = await q.get();
    const ads: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by target country if specified, fallback to global or matching logic
      if (data.targetCountry === 'global' || data.targetCountry === targetCountry || targetCountry === 'global') {
        ads.push({ id: doc.id, ...data });
      }
    });

    if (ads.length === 0) {
      return NextResponse.json({ error: 'No ads available' }, { status: 404, headers: corsHeaders });
    }

    // 2. Select a random ad
    const randomAd = ads[Math.floor(Math.random() * ads.length)];

    // 3. Create auth token for impressions/clicks
    const hmac = crypto.createHmac('sha256', process.env.API_SECRET || 'default_secret_key');
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
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error serving ad:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
