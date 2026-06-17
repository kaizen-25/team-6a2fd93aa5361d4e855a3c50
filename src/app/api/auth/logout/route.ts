import { destroySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout — destroy user session
export async function POST() {
  try {
    await destroySession();
    return Response.json({ success: true });
  } catch (error) {
    console.error('POST /api/auth/logout error:', error);
    return Response.json({ error: 'Logout failed' }, { status: 500 });
  }
}
