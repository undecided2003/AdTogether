import { NextResponse } from 'next/server';
import type { DocumentData, DocumentReference, Transaction } from 'firebase-admin/firestore';
import { screenAdContent } from '@/app/create-ad/actions';
import { consumeUserRateLimit } from '@/lib/api-rate-limit';
import { COUNTRIES } from '@/lib/countries';
import { CREDIT_AUTO_PAUSE_REASON, MANUAL_PAUSE_FIELD } from '@/lib/credit-policy';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUid, ensureUserProfile } from '@/lib/request-auth';
import { parseSafeHttpUrl } from '@/lib/safe-url-fetch';

export const runtime = 'nodejs';

const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));
const MAX_BLOCKED_ORIGINS = 100;

interface CampaignContent {
  title: string;
  description: string;
  imageUrl: string;
  clickUrl: string;
  targetCountries: string[];
  adType: 'banner' | 'interstitial';
}

function stringValue(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function campaignId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,1500}$/.test(value) ? value : null;
}

function adReference(adId: string): DocumentReference<DocumentData> {
  return adminDb.collection('ads').doc(adId) as DocumentReference<DocumentData>;
}

function blockedOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 50 && !/[\u0000-\u001f\u007f]/.test(trimmed)
    ? trimmed
    : null;
}

function campaignContent(value: unknown): CampaignContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const title = stringValue(body.title, 30);
  const description = stringValue(body.description, 90);
  const targetCountries = body.targetCountries;
  const adType = body.adType;
  if (!title || !description || !Array.isArray(targetCountries) ||
    targetCountries.length > COUNTRY_CODES.size ||
    !targetCountries.every((country) => typeof country === 'string' && COUNTRY_CODES.has(country)) ||
    new Set(targetCountries).size !== targetCountries.length ||
    (adType !== 'banner' && adType !== 'interstitial')) {
    return null;
  }

  try {
    return {
      title,
      description,
      imageUrl: parseSafeHttpUrl(body.imageUrl).toString(),
      clickUrl: parseSafeHttpUrl(body.clickUrl).toString(),
      targetCountries: [...targetCountries],
      adType,
    };
  } catch {
    return null;
  }
}

function sameCampaignContent(left: CampaignContent | null, right: CampaignContent): boolean {
  return !!left &&
    left.title === right.title &&
    left.description === right.description &&
    left.imageUrl === right.imageUrl &&
    left.clickUrl === right.clickUrl &&
    left.adType === right.adType &&
    left.targetCountries.length === right.targetCountries.length &&
    left.targetCountries.every((country, index) => country === right.targetCountries[index]);
}

async function requestBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function authorizeWrite(request: Request): Promise<{ uid: string } | NextResponse> {
  const uid = await authenticatedUid(request);
  if (!uid) return NextResponse.json({ success: false, error: 'Authentication is required' }, { status: 401 });

  try {
    const allowed = await consumeUserRateLimit({ uid, scope: 'campaign-write', limit: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many campaign changes. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
  } catch (error) {
    console.error('Campaign rate-limit error:', error);
    return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 });
  }

  return { uid };
}

function isResponse(value: { uid: string } | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

async function screeningResult(content: CampaignContent): Promise<NextResponse | null> {
  const screening = await screenAdContent(content.title, content.description, content.clickUrl);
  if (screening.success !== true) {
    return NextResponse.json(
      { success: false, error: 'Ad screening is temporarily unavailable. Please try again.' },
      { status: 503 },
    );
  }
  if (screening.passed !== true) {
    const reason = typeof screening.reason === 'string' && screening.reason.trim()
      ? screening.reason.trim().slice(0, 300)
      : 'Violates content guidelines.';
    return NextResponse.json({ success: false, error: `Ad rejected by policy: ${reason}` }, { status: 422 });
  }
  return null;
}

async function userOwnsCampaign(uid: string, adId: string): Promise<boolean> {
  const campaign = await adminDb.collection('ads').doc(adId).get();
  return campaign.exists && campaign.data()?.ownerUid === uid;
}

export async function POST(request: Request) {
  const authorization = await authorizeWrite(request);
  if (isResponse(authorization)) return authorization;

  const body = await requestBody(request);
  const content = campaignContent(body);
  if (!content) {
    return NextResponse.json({ success: false, error: 'Invalid campaign content' }, { status: 400 });
  }

  try {
    let profile = await adminDb.collection('users').doc(authorization.uid).get();
    if (!profile.exists) {
      await ensureUserProfile(authorization.uid);
      profile = await adminDb.collection('users').doc(authorization.uid).get();
    }
    if (!profile.exists) {
      return NextResponse.json({ success: false, error: 'User profile was not found' }, { status: 409 });
    }

    const rejected = await screeningResult(content);
    if (rejected) return rejected;

    const campaign = await adminDb.collection('ads').add({
      ownerUid: authorization.uid,
      ...content,
      active: true,
      autoPausedReason: null,
      [MANUAL_PAUSE_FIELD]: false,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, id: campaign.id }, { status: 201 });
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create campaign' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authorization = await authorizeWrite(request);
  if (isResponse(authorization)) return authorization;

  const body = await requestBody(request);
  const adId = campaignId(body?.adId);
  if (!body || !adId) {
    return NextResponse.json({ success: false, error: 'A valid campaign ID is required' }, { status: 400 });
  }

  try {
    if (body.action === 'content') {
      if (!await userOwnsCampaign(authorization.uid, adId)) {
        return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
      }
      const content = campaignContent(body);
      if (!content) {
        return NextResponse.json({ success: false, error: 'Invalid campaign content' }, { status: 400 });
      }
      const rejected = await screeningResult(content);
      if (rejected) return rejected;

      let updated = false;
      await adminDb.runTransaction(async (transaction: Transaction) => {
        const ref = adReference(adId);
        const campaign = await transaction.get(ref);
        if (!campaign.exists || campaign.data()?.ownerUid !== authorization.uid) return;
        transaction.update(ref, content as DocumentData);
        updated = true;
      });
      if (!updated) return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'status') {
      if (typeof body.active !== 'boolean') {
        return NextResponse.json({ success: false, error: 'A campaign status is required' }, { status: 400 });
      }
      const requestedActive = body.active;

      let approvedContent: CampaignContent | null = null;
      if (requestedActive) {
        const campaign = await adminDb.collection('ads').doc(adId).get();
        const data = campaign.data();
        if (!campaign.exists || data?.ownerUid !== authorization.uid) {
          return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
        }
        if (data.autoPausedReason === CREDIT_AUTO_PAUSE_REASON) {
          return NextResponse.json(
            { success: false, error: 'This campaign is paused until your credit balance recovers' },
            { status: 409 },
          );
        }
        approvedContent = campaignContent(data);
        if (!approvedContent) {
          return NextResponse.json(
            { success: false, error: 'Campaign content must be updated before it can be activated' },
            { status: 409 },
          );
        }
        const rejected = await screeningResult(approvedContent);
        if (rejected) return rejected;
      }

      let outcome: 'updated' | 'missing' | 'credit-paused' | 'content-changed' = 'missing';
      await adminDb.runTransaction(async (transaction: Transaction) => {
        const ref = adReference(adId);
        const campaign = await transaction.get(ref);
        const data = campaign.data();
        if (!campaign.exists || data?.ownerUid !== authorization.uid) return;
        if (data.autoPausedReason === CREDIT_AUTO_PAUSE_REASON) {
          outcome = 'credit-paused';
          return;
        }
        if (requestedActive && !sameCampaignContent(campaignContent(data), approvedContent!)) {
          outcome = 'content-changed';
          return;
        }
        transaction.update(ref, {
          active: requestedActive,
          autoPausedReason: null,
          [MANUAL_PAUSE_FIELD]: !requestedActive,
        });
        outcome = 'updated';
      });
      if (outcome === 'missing') return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
      if (outcome === 'credit-paused') {
        return NextResponse.json(
          { success: false, error: 'This campaign is paused until your credit balance recovers' },
          { status: 409 },
        );
      }
      if (outcome === 'content-changed') {
        return NextResponse.json(
          { success: false, error: 'Campaign content changed while it was being screened. Please try again.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'block-origin') {
      const source = blockedOrigin(body.source);
      if (!source || typeof body.blocked !== 'boolean') {
        return NextResponse.json({ success: false, error: 'A valid origin and block state are required' }, { status: 400 });
      }

      let outcome: 'updated' | 'missing' | 'limit' = 'missing';
      await adminDb.runTransaction(async (transaction: Transaction) => {
        const ref = adReference(adId);
        const campaign = await transaction.get(ref);
        const data = campaign.data();
        if (!campaign.exists || data?.ownerUid !== authorization.uid) return;
        const current = Array.isArray(data.blockedOrigins)
          ? data.blockedOrigins.filter((origin: unknown): origin is string => typeof origin === 'string')
          : [];
        const alreadyBlocked = current.includes(source);
        if (body.blocked && !alreadyBlocked && current.length >= MAX_BLOCKED_ORIGINS) {
          outcome = 'limit';
          return;
        }
        const next = body.blocked
          ? (alreadyBlocked ? current : [...current, source])
          : current.filter((origin: string) => origin !== source);
        transaction.update(ref, { blockedOrigins: next });
        outcome = 'updated';
      });
      if (outcome === 'missing') return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
      if (outcome === 'limit') return NextResponse.json({ success: false, error: 'Origin blocklist is full' }, { status: 409 });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Campaign update error:', error);
    return NextResponse.json({ success: false, error: 'Unable to update campaign' }, { status: 500 });
  }

  return NextResponse.json({ success: false, error: 'Unknown campaign action' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const authorization = await authorizeWrite(request);
  if (isResponse(authorization)) return authorization;

  const body = await requestBody(request);
  const adId = campaignId(body?.adId);
  if (!adId) return NextResponse.json({ success: false, error: 'A valid campaign ID is required' }, { status: 400 });

  try {
    let deleted = false;
    await adminDb.runTransaction(async (transaction: Transaction) => {
      const ref = adReference(adId);
      const campaign = await transaction.get(ref);
      if (!campaign.exists || campaign.data()?.ownerUid !== authorization.uid) return;
      transaction.delete(ref);
      deleted = true;
    });
    if (!deleted) return NextResponse.json({ success: false, error: 'Campaign was not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Campaign deletion error:', error);
    return NextResponse.json({ success: false, error: 'Unable to delete campaign' }, { status: 500 });
  }
}
