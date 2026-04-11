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

export async function POST(request: Request) {
  try {
    const { adId, token, apiKey } = await request.json();

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

    let publisherRef: any = null;
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
      const adSnap = await transaction.get(adRef);
      if (!adSnap.exists) {
        throw new Error('Ad not found');
      }

      const adData = adSnap.data();
      if (!adData) throw new Error('Ad data missing');
      
      const ownerUid = adData.ownerUid;
      
      // Increment ad impressions
      const currentImpressions = adData.impressions || 0;
      transaction.update(adRef, { impressions: currentImpressions + 1 });

      if (ownerUid) {
        const userRef = db.collection('users').doc(ownerUid);
        const userSnap = await transaction.get(userRef);

        if (userSnap.exists) {
          const userData = userSnap.data();
          if (userData) {
            const currentCredits = userData.credits || 0;

            if (currentCredits <= -5) {
              // No credits left (and hit the negative limit), deactivate ad and don't deduct
              transaction.update(adRef, { active: false });
              outOfCredits = true;
            } else {
              // Deduct safely
              transaction.update(userRef, { credits: currentCredits - 1 });
              if (currentCredits - 1 <= -5) {
                transaction.update(adRef, { active: false });
              }
            }
          }
        }
      }

      if (publisherRef) {
        const pDoc = (await transaction.get(publisherRef)) as any;
        if (pDoc.exists) {
          const pData = pDoc.data();
          if (pData) {
             const pCredits = pData.credits || 0;
             transaction.update(publisherRef, { credits: pCredits + 1 });
          }
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
