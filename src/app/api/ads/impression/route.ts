import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCountryTier, getTierMultiplier } from '@/lib/country-tiers';
import { sendResendEmail } from '@/lib/resend';

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
    const ipCountry = reqHeaders.get('x-vercel-ip-country') 
      || reqHeaders.get('x-appengine-country')
      || reqHeaders.get('x-country-code')
      || reqHeaders.get('x-client-geo-country')
      || reqHeaders.get('cf-ipcountry')         // Cloudflare
      || reqHeaders.get('x-country')
      || null;
    
    // Extract origin for web tracking
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    
    if (!checkRateLimit(ip, 200, 60 * 1000)) { // 200 requests per minute
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const { adId, token, appId, apiKey, bundleId, country, platform, appName, environment } = await request.json();
    const effectiveAppId = appId || apiKey;
    
    // Ignore local test traffic to prevent statistics skewing
    if (environment === 'development' || environment === 'test') {
      return NextResponse.json({ success: true, warning: 'ignored_test_traffic' }, { status: 200, headers: corsHeaders });
    }
    
    const finalCountry = country || ipCountry;
    const tier = getCountryTier(finalCountry);
    const tierMultiplier = getTierMultiplier(tier);

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

    let publisherRef: any = null;
    if (effectiveAppId) {
      // Check appIds array
      const pSnapAppIds = await db.collection('users').where('appIds', 'array-contains', effectiveAppId).limit(1).get();
      if (!pSnapAppIds.empty) {
        publisherRef = pSnapAppIds.docs[0].ref;
      }
    }

    const adRef = db.collection('ads').doc(adId);
    let outOfCredits = false;
    let sendCreditNotification = false;
    let creditNotificationType: 'low' | 'out_of_credits' | null = null;
    let creditNotificationEmail: string | null = null;

    // Use runTransaction to safely process impression and deduct/add credits
    await db.runTransaction(async (transaction: any) => {
      // 1. ALL READS FIRST
      const adSnap = await transaction.get(adRef);
      if (!adSnap.exists) {
        throw new Error('Ad not found');
      }

      const adData = adSnap.data();
      if (!adData) throw new Error('Ad data missing');
      
      const ownerUid = adData.ownerUid;
      const adType = adData.adType || 'banner';
      
      const baseCost = adType === 'interstitial' ? 5 : 1;
      const creditCost = baseCost * tierMultiplier;

      let userSnap = null;
      let userRef = null;
      if (ownerUid) {
        userRef = db.collection('users').doc(ownerUid);
        userSnap = await transaction.get(userRef);
      }

      let pSnap: any = null;
      if (publisherRef) {
        pSnap = await transaction.get(publisherRef);
      }

      // 2. Determine if this is a self-impression
      let isSelfImpression = false;
      
      // Check if publisher is the owner
      if (ownerUid && pSnap?.exists && pSnap.id === ownerUid) {
        isSelfImpression = true;
      } 
      // Check if destination matches source
      else if (adData.clickUrl && rawSource && rawSource !== 'unknown_origin') {
        try {
          const clickUrlObj = new URL(adData.clickUrl);
          const clickHostname = clickUrlObj.hostname.toLowerCase();
          const sourceHostname = rawSource.toLowerCase();

          if (
            clickHostname === sourceHostname || 
            clickHostname.endsWith('.' + sourceHostname) || 
            sourceHostname.endsWith('.' + clickHostname)
          ) {
            isSelfImpression = true;
          }
        } catch (e) {}
      }

      // 3. ALL WRITES AFTER READS
      // Increment ad impressions
      const currentImpressions = adData.impressions || 0;
      
      // Track origins
      const originsMap = adData.origins || {};
      const currentSourceCount = originsMap[safeSourceId] || 0;
      originsMap[safeSourceId] = currentSourceCount + 1;
      
      const lastSeenMap = adData.lastSeenByOrigin || {};
      lastSeenMap[safeSourceId] = new Date().toISOString();

      const recentViewsMap = adData.recentViewsByOrigin || {};
      const currentViews = recentViewsMap[safeSourceId] || [];
      currentViews.push({
        time: new Date().toISOString(),
        region: finalCountry || 'Unknown'
      });
      if (currentViews.length > 40) {
        currentViews.splice(0, currentViews.length - 40);
      }
      recentViewsMap[safeSourceId] = currentViews;

      transaction.update(adRef, { 
        impressions: currentImpressions + 1,
        origins: originsMap,
        lastSeenByOrigin: lastSeenMap,
        recentViewsByOrigin: recentViewsMap
      });

      // Only deduct credits if NOT a self-impression
      if (!isSelfImpression) {
        if (userSnap && userSnap.exists && userRef) {
          const userData = userSnap.data();
          if (userData) {
            const currentCredits = userData.credits || 0;
            const email = userData.email;
            const currentNotificationStage = userData.creditNotificationStage || 'none';
            const nextCredits = currentCredits - creditCost;
            let nextNotificationStage = currentNotificationStage;

            if (currentCredits <= -5) {
              // No credits left (and hit the negative limit), deactivate ad and don't deduct
              transaction.update(adRef, { active: false });
              outOfCredits = true;
            } else {
              const dateKey = new Date().toISOString().split('T')[0];
              const dailySpend = userData.dailySpend || {};
              dailySpend[dateKey] = (dailySpend[dateKey] || 0) + creditCost;

              if (nextCredits <= 0) {
                nextNotificationStage = 'out_of_credits';
                if (currentNotificationStage !== 'out_of_credits' && currentCredits > 0 && email) {
                  sendCreditNotification = true;
                  creditNotificationType = 'out_of_credits';
                  creditNotificationEmail = email;
                }
              } else if (nextCredits < 25) {
                nextNotificationStage = 'low';
                if (currentNotificationStage !== 'low' && currentCredits >= 25 && email) {
                  sendCreditNotification = true;
                  creditNotificationType = 'low';
                  creditNotificationEmail = email;
                }
              } else {
                nextNotificationStage = 'none';
              }

              transaction.update(userRef, { 
                credits: nextCredits,
                dailySpend,
                creditNotificationStage: nextNotificationStage,
              });

              if (nextCredits <= -5) {
                transaction.update(adRef, { active: false });
              }
            }
          }
        }

        // Add credits to publisher if NOT a self-impression
        if (pSnap && pSnap.exists && publisherRef) {
          const pData = pSnap.data();
          if (pData) {
             const pCredits = pData.credits || 0;
             
             // Build earnings log entry for publisher visibility
             const earningsLog = pData.earningsLog || {};
             const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
             const existing = earningsLog[logKey] || {};
             const currentViews = existing.recentViews || [];
             currentViews.push({
               time: new Date().toISOString(),
               region: finalCountry || 'Unknown',
               creditsEarned: creditCost
             });
             if (currentViews.length > 40) currentViews.splice(0, currentViews.length - 40);

             earningsLog[logKey] = {
               adId: adId,
               adTitle: adData.title || 'Unknown Campaign',
               adDescription: adData.description || '',
               adImageUrl: adData.imageUrl || '',
               adType: adType,
               appId: effectiveAppId || '',
               platform: platform || existing.platform || '',
               appName: appName || existing.appName || '',
               impressions: (existing.impressions || 0) + 1,
               clicks: existing.clicks || 0,
               creditsEarned: (existing.creditsEarned || 0) + creditCost,
               lastUpdated: new Date().toISOString(),
               recentViews: currentViews,
             };
             const dateKey = new Date().toISOString().split('T')[0];
             const dailyEarnings = pData.dailyEarnings || {};
             dailyEarnings[dateKey] = (dailyEarnings[dateKey] || 0) + creditCost;
             const nextPublisherCredits = pCredits + creditCost;
             let nextPublisherNotificationStage = pData.creditNotificationStage || 'none';

             if (nextPublisherCredits >= 25) {
               nextPublisherNotificationStage = 'none';
             } else if (nextPublisherCredits <= 0) {
               nextPublisherNotificationStage = 'out_of_credits';
             } else {
               nextPublisherNotificationStage = 'low';
             }

             transaction.update(publisherRef, { 
               credits: nextPublisherCredits,
               earningsLog,
               dailyEarnings,
               creditNotificationStage: nextPublisherNotificationStage,
             });
          }
        }
      } else {
        // Still log the impression in the earnings log for the publisher (even if 0 credits earned)
        if (pSnap && pSnap.exists && publisherRef) {
          const pData = pSnap.data();
          if (pData) {
             const earningsLog = pData.earningsLog || {};
             const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
             const existing = earningsLog[logKey] || {};
             const currentViews = existing.recentViews || [];
             currentViews.push({
               time: new Date().toISOString(),
               region: finalCountry || 'Unknown',
               creditsEarned: 0
             });
             if (currentViews.length > 40) currentViews.splice(0, currentViews.length - 40);

             earningsLog[logKey] = {
               adId: adId,
               adTitle: adData.title || 'Unknown Campaign (Self)',
               adDescription: adData.description || '',
               adImageUrl: adData.imageUrl || '',
               adType: adType,
               appId: effectiveAppId || '',
               platform: platform || existing.platform || '',
               appName: appName || existing.appName || '',
               impressions: (existing.impressions || 0) + 1,
               clicks: existing.clicks || 0,
               creditsEarned: existing.creditsEarned || 0, // No new credits
               lastUpdated: new Date().toISOString(),
               recentViews: currentViews,
             };
             transaction.update(publisherRef, { earningsLog });
          }
        }
      }
    });

    if (sendCreditNotification && creditNotificationType && creditNotificationEmail) {
      const resendApiKey = secretsData.RESEND_API_KEY || process.env.RESEND_API_KEY;
      const subject = creditNotificationType === 'low'
        ? 'Your AdTogether credits are running low'
        : 'Your AdTogether account has reached zero credits';
      const html = creditNotificationType === 'low'
        ? `<p>Hi there,</p>
           <p>Your AdTogether account just dropped below 25 credits. Keep earning more credits by showing ads in your app so your campaigns keep running.</p>
           <p><strong>Tip:</strong> Display more ads or use higher-value interstitial ads to earn credits faster.</p>
           <p>Visit your dashboard to manage your campaigns and start earning again.</p>`
        : `<p>Hi there,</p>
           <p>Your AdTogether account has reached zero credits. Your campaigns will stop running until you earn more credits by showing ads.</p>
           <p>Please open the dashboard and display more ads to earn credits again.</p>`;

      await sendResendEmail({
        apiKey: resendApiKey || '',
        to: creditNotificationEmail,
        subject,
        html,
      });
    }

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
