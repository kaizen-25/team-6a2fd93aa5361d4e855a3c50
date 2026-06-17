import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyPassword, sanitizeInput } from '@/lib/security';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { createSession, logLoginAttempt } from '@/lib/session';

export const dynamic = 'force-dynamic';

// POST /api/auth/login — authenticate user
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 'auth/login', RATE_LIMITS.auth);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterMs!);
    }

    const body = await request.json();
    const identifier = sanitizeInput(body.identifier || '').toLowerCase(); // username or email
    const password = body.password || '';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!identifier || !password) {
      return Response.json({ error: 'Username/email and password are required' }, { status: 400 });
    }

    const db = await getDb();

    // Find user by username or email
    const user = await db.collection('users').findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      await logLoginAttempt(null, identifier, ip, userAgent, false);
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logLoginAttempt(user._id.toString(), user.username, ip, userAgent, false);
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    await createSession(user._id.toString(), user.username);

    // Log successful login
    await logLoginAttempt(user._id.toString(), user.username, ip, userAgent, true);

    return Response.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}
