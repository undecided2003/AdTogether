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
    const adUnitId = searchParams.get('adUnitId');

    const ads: any[] = [];
    
    try {
      // 1. Fetch active ads
      const adsRef = db.collection('ads');
      const q = adsRef.where('active', '==', true);
      const querySnapshot = await q.get();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.targetCountry === 'global' || data.targetCountry === targetCountry || targetCountry === 'global') {
          ads.push({ id: doc.id, ...data });
        }
      });
    } catch (dbError) {
      console.error('Database fetch failed:', dbError);
      // Continue to fallback logic below
    }

    // Fallback for demo purposes if no ads in DB or query failed
    if (ads.length === 0 && adUnitId === 'example_banner') {
      return NextResponse.json(
        {
          id: 'ajF9OqQSlyzsK5oEXhLA',
          title: 'Relax Software: Custom Apps',
          description: 'Discover fun, useful apps for Android, iOS, and web. AI-powered tools for life & business.',
          imageUrl: 'https://firebasestorage.googleapis.com/v0/b/adtogether-15453.firebasestorage.app/o/ads%2FBFkKpwekuTa5avhO5bxTN4qTXZG2%2F1775935883993_scraped-image.jpeg?alt=media&token=0b8310e7-3660-4b99-b233-354e6894e2be',
          clickUrl: 'https://relaxsoftwareapps.com',
          token: 'demo_token_relax_software',
        },
        { status: 200, headers: corsHeaders }
      );
    }

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
