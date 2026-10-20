import { NextResponse, type NextRequest } from 'next/server';

/**
 * Reject requests that reach this Cloud Run service directly through its
 * `*.run.app` URL instead of through Firebase Hosting.
 *
 * Header evidence (verified against production request logs and Firebase
 * Hosting header dumps):
 * - The `Host` header is the Cloud Run service URL (`*.run.app`) for BOTH
 *   Hosting-forwarded and direct traffic, so it can never discriminate.
 * - Firebase Hosting sets `X-Forwarded-Host` to the original hosting domain
 *   when it forwards a rewrite; direct Cloud Run traffic has no
 *   `X-Forwarded-Host` header at all.
 *
 * The check is fail-open by design: it only blocks when `X-Forwarded-Host`
 * is entirely absent AND the Host targets the run.app service domain. Any
 * Hosting-forwarded request (custom domain, *.web.app, *.firebaseapp.com,
 * preview channels) carries the header and is always allowed through, so
 * real users can never be affected by domain changes.
 *
 * Blocking here returns before any Next.js routing, page rendering, or
 * database work, keeping internet scanner traffic at near-zero cost.
 * (The invocation itself still counts; this is memory/latency relief.)
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (!forwardedHost && /\.run\.app$/i.test(host)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}
