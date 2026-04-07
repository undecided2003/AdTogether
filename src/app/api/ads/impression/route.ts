import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

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
    const { adId } = await request.json();

    if (!adId) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400, headers: corsHeaders });
    }

    // 1. Get the ad to find the owner
    const adRef = doc(db, 'ads', adId);
    const adSnap = await getDoc(adRef);

    if (!adSnap.exists()) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404, headers: corsHeaders });
    }

    const adData = adSnap.data();
    const ownerUid = adData.ownerUid;

    // 2. Increment impression count on the ad (optional, but good for stats)
    await updateDoc(adRef, { impressions: increment(1) }).catch(console.error);

    // 3. Decrement credit from the owner (skip if owner doesn't exist)
    if (ownerUid) {
      const userRef = doc(db, 'users', ownerUid);
      // We assume each impression costs 1 credit
      // Note: We are using the Client SDK here. In a true production environment, 
      // this should be protected by Firebase Admin SDK to prevent abuse without Auth.
      await updateDoc(userRef, { credits: increment(-1) }).catch(console.error);
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error tracking impression:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
