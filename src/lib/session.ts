import { getDb } from './mongodb';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

const SESSION_DURATION_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Generate a random session token
 */
function generateToken(): string {
  const segments: string[] = [];
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let s = 0; s < 8; s++) {
    let segment = '';
    for (let i = 0; i < 8; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}

/**
 * Create a new user session and set cookie
 */
export async function createSession(userId: string, username: string): Promise<string> {
  const db = await getDb();
  const token = generateToken();
  const now = new Date();

  await db.collection('sessions').insertOne({
    token,
    userId: new ObjectId(userId),
    username,
    createdAt: now,
    lastActivity: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  });

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set('user_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
    sameSite: 'strict',
  });

  return token;
}

/**
 * Verify and extend a user session
 * Returns the user info if session is valid, null otherwise
 */
export async function verifySession(): Promise<{
  userId: string;
  username: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const db = await getDb();
    const session = await db.collection('sessions').findOne({
      token: sessionCookie.value,
    });

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      // Clean up expired session
      await db.collection('sessions').deleteOne({ _id: session._id });
      const cs = await cookies();
      cs.delete('user_session');
      return null;
    }

    // Extend session (sliding window) — update lastActivity and expiresAt
    const now = new Date();
    await db.collection('sessions').updateOne(
      { _id: session._id },
      {
        $set: {
          lastActivity: now,
          expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
        },
      }
    );

    // Update cookie maxAge
    const cs2 = await cookies();
    cs2.set('user_session', sessionCookie.value, {
      httpOnly: true,
      path: '/',
      maxAge: SESSION_DURATION_MS / 1000,
      sameSite: 'strict',
    });

    return {
      userId: session.userId.toString(),
      username: session.username,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Destroy the current user session
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    if (sessionCookie?.value) {
      const db = await getDb();
      await db.collection('sessions').deleteOne({ token: sessionCookie.value });
    }

    const cs = await cookies();
    cs.delete('user_session');
  } catch (error) {
    console.error('Session destruction error:', error);
  }
}

/**
 * Log a login attempt to login_history collection
 */
export async function logLoginAttempt(
  userId: string | null,
  username: string,
  ip: string,
  userAgent: string,
  success: boolean
): Promise<void> {
  try {
    const db = await getDb();
    await db.collection('login_history').insertOne({
      userId: userId ? new ObjectId(userId) : null,
      username,
      ip,
      userAgent,
      timestamp: new Date(),
      success,
    });
  } catch (error) {
    console.error('Login history logging error:', error);
  }
}
