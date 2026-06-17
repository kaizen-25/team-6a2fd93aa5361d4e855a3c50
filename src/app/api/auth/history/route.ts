import { verifySession } from '@/lib/session';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET /api/auth/history — get login timeline for authenticated user
export async function GET() {
  try {
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const history = await db
      .collection('login_history')
      .find({ userId: new ObjectId(user.userId) })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    const sanitizedHistory = history.map((entry) => ({
      timestamp: entry.timestamp,
      ip: entry.ip,
      userAgent: entry.userAgent,
      success: entry.success,
    }));

    return Response.json({ history: sanitizedHistory });
  } catch (error) {
    console.error('GET /api/auth/history error:', error);
    return Response.json({ error: 'Failed to fetch login history' }, { status: 500 });
  }
}
