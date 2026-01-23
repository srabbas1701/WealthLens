/**
 * Web Vitals API Route
 * 
 * Receives and logs Core Web Vitals metrics from the client.
 * 
 * Endpoints:
 * - POST /api/analytics/web-vitals - Accepts Web Vitals metrics
 * - GET /api/analytics/web-vitals - Health check
 * 
 * Rate Limiting: Max 10 requests per minute per IP
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 10; // Max requests
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_WINDOW);

/**
 * POST /api/analytics/web-vitals
 * Accepts Web Vitals metrics
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(request);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const { name, value, rating, delta, id, timestamp, userAgent, url } = body;

    if (!name || typeof value !== 'number' || !rating || typeof delta !== 'number' || !id) {
      return NextResponse.json(
        { success: false, error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Validate metric name
    const validMetricNames = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'];
    if (!validMetricNames.includes(name)) {
      return NextResponse.json(
        { success: false, error: `Invalid metric name. Must be one of: ${validMetricNames.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate rating
    const validRatings = ['good', 'needs-improvement', 'poor'];
    if (!validRatings.includes(rating)) {
      return NextResponse.json(
        { success: false, error: `Invalid rating. Must be one of: ${validRatings.join(', ')}` },
        { status: 400 }
      );
    }

    // Log metric (for now - can extend to database later)
    console.log('[Web Vitals API] Received metric:', {
      name,
      value: value.toFixed(2),
      rating,
      delta: delta.toFixed(2),
      id,
      timestamp: timestamp || new Date().toISOString(),
      url: url || 'unknown',
    });

    // TODO: Store in database or send to analytics service
    // For now, just log it

    return NextResponse.json({
      success: true,
      message: 'Metric received',
    });
  } catch (error: any) {
    console.error('[Web Vitals API] Error processing metric:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/web-vitals
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Web Vitals API is running',
    timestamp: new Date().toISOString(),
  });
}

// Reject other HTTP methods
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
