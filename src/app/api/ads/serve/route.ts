import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
    const adsRef = collection(db, 'ads');
    // Using a simpler query to ensure it works without complex composite indexes initially
    const q = query(adsRef, where('active', '==', true));
    
    const querySnapshot = await getDocs(q);
    const ads: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by target country if specified, fallback to global or matching logic
      if (data.targetCountry === 'globally' || data.targetCountry === targetCountry || targetCountry === 'global') {
        ads.push({ id: doc.id, ...data });
      }
    });

    if (ads.length === 0) {
      return NextResponse.json({ error: 'No ads available' }, { status: 404, headers: corsHeaders });
    }

    // 2. Select a random ad
    const randomAd = ads[Math.floor(Math.random() * ads.length)];

    // 3. Return the selected ad
    return NextResponse.json(
      {
        id: randomAd.id,
        title: randomAd.title,
        description: randomAd.description,
        imageUrl: randomAd.imageUrl,
        clickUrl: randomAd.clickUrl,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error serving ad:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
