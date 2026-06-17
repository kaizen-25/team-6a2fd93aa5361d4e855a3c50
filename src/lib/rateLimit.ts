/**
 * In-memory rate limiter
 * Tracks requests per IP per route within a time window
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store: key = `${ip}:${route}` → entry
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Preset configurations
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },       // 10 requests / 15 min
  register: { windowMs: 15 * 60 * 1000, maxRequests: 5 },    // 5 registrations / 15 min
  api: { windowMs: 60 * 1000, maxRequests: 60 },              // 60 requests / 1 min
  search: { windowMs: 60 * 1000, maxRequests: 30 },           // 30 searches / 1 min
} as const;

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig = RATE_LIMITS.api
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const key = `${ip}:${route}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Get the client IP from a request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return Response.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfterSeconds: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
