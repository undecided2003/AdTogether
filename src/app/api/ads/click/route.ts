import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

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

    // Increment click count on the ad document for analytics
    const adRef = doc(db, 'ads', adId);
    await updateDoc(adRef, { clicks: increment(1) }).catch(console.error);

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
