import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

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
    const { adId, token } = await request.json();

    if (!adId) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400, headers: corsHeaders });
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Auth token is required' }, { status: 401, headers: corsHeaders });
    }

    const hmac = crypto.createHmac('sha256', process.env.API_SECRET || 'default_secret_key');
    hmac.update(adId);
    const expectedToken = hmac.digest('hex');

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 403, headers: corsHeaders });
    }

    // Increment click count on the ad document for analytics
    const adRef = db.collection('ads').doc(adId);
    await adRef.update({ clicks: FieldValue.increment(1) }).catch(console.error);

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
