import { NextRequest, NextResponse } from 'next/server';

/**
 * Range-forwarding passthrough for PMTiles archives.
 *
 * PMTiles is read by the browser with HTTP range requests against a single
 * large file, so the origin has to answer cross-origin. Some of the buckets
 * holding tasked imagery do not set CORS headers, and a browser will refuse
 * the read no matter that the bytes are public. This forwards the Range header
 * upstream and re-emits the response with the CORS headers the archive is
 * missing.
 *
 * The body is streamed rather than buffered: these archives run to hundreds of
 * megabytes, and buffering one to serve a 16 KB range would be absurd.
 *
 * Prefer fixing CORS on the bucket. This exists for the ones we do not own.
 */

/** Hosts this proxy will read from. An open proxy is not on offer. */
const ALLOWED_HOSTS = new Set([
  'digitalearthbasemap.s3.ap-southeast-1.amazonaws.com',
  'aeye-checker.s3.ap-southeast-1.amazonaws.com',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  // Without this the browser cannot read Content-Range off the 206 and the
  // PMTiles reader cannot tell what it was given.
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Malformed url parameter' }, { status: 400 });
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const range = request.headers.get('range');

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: '*/*',
        'User-Agent': 'UzmaSatria-PMTiles-Proxy/1.0',
        ...(range ? { Range: range } : {}),
      },
      // Archives are far past Next's fetch-cache ceiling, and the immutable
      // Cache-Control below already lets the browser and any CDN hold ranges.
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: 'Upstream refused the range request' },
        { status: upstream.status },
      );
    }

    const headers = new Headers(CORS_HEADERS);
    for (const key of ['content-type', 'content-length', 'content-range', 'etag'] as const) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    headers.set('Accept-Ranges', 'bytes');
    // A tasked capture is a fixed archive — once fetched, a range never changes.
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error('PMTiles proxy error:', error);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}
