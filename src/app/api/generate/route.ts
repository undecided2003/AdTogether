import { NextResponse } from 'next/server';
import { generateAdContent } from '@/app/create-ad/actions';
import { consumeUserRateLimit } from '@/lib/api-rate-limit';
import { authenticatedUid } from '@/lib/request-auth';
import { parseSafeHttpUrl } from '@/lib/safe-url-fetch';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const uid = await authenticatedUid(req);
  if (!uid) return NextResponse.json({ success: false, error: 'Authentication is required' }, { status: 401 });

  try {
    const allowed = await consumeUserRateLimit({ uid, scope: 'generate', limit: 5, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many generation requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
  } catch (error) {
    console.error('API Generate rate-limit error:', error);
    return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const clickUrl = body?.clickUrl;
    const normalizedUrl = parseSafeHttpUrl(clickUrl).toString();
    const result = await generateAdContent(normalizedUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Generate Error:', error);
    return NextResponse.json(
      { success: false, error: 'A valid HTTP or HTTPS URL is required' },
      { status: 400 }
    );
  }
}
