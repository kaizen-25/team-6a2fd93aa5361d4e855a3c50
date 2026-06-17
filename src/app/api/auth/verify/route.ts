import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET /api/auth/verify — check if user session is valid
export async function GET() {
  try {
    const user = await verifySession();

    if (user) {
      return Response.json({
        authenticated: true,
        user: {
          userId: user.userId,
          username: user.username,
        },
      });
    }

    return Response.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    console.error('GET /api/auth/verify error:', error);
    return Response.json({ authenticated: false }, { status: 500 });
  }
}
