import { NextResponse } from 'next/server';
import { screenAdContent } from '@/app/create-ad/actions';
import { consumeUserRateLimit } from '@/lib/api-rate-limit';
import { authenticatedUid } from '@/lib/request-auth';
import { parseSafeHttpUrl } from '@/lib/safe-url-fetch';

export const runtime = 'nodejs';

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export async function POST(req: Request) {
  const uid = await authenticatedUid(req);
  if (!uid) return NextResponse.json({ success: false, error: 'Authentication is required' }, { status: 401 });

  try {
    const allowed = await consumeUserRateLimit({ uid, scope: 'screen', limit: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many screening requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
  } catch (error) {
    console.error('API Screen rate-limit error:', error);
    return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { title, description, clickUrl } = body || {};
    if (!validText(title, 30) || !validText(description, 90)) {
      return NextResponse.json({ success: false, error: 'Title and description are required' }, { status: 400 });
    }
    const normalizedUrl = parseSafeHttpUrl(clickUrl).toString();
    const result = await screenAdContent(title.trim(), description.trim(), normalizedUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Screen Error:', error);
    return NextResponse.json(
      { success: false, error: 'A valid title, description, and HTTP or HTTPS URL are required' },
      { status: 400 }
    );
  }
}
