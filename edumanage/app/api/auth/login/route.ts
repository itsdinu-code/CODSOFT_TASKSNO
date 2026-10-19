import { loginSchema } from "../../../lib/auth-validation";
import { authConfigured, sessionCookieHeader, signSession, verifyPassword } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !process.env.DATABASE_URL || !authConfigured()) return Response.json({ error: "Invalid email or password." }, { status: 401 });
  try {
    const user = await getPrismaClient().user.findUnique({ where: { email: parsed.data.email }, select: { id: true, role: true, passwordHash: true } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return Response.json({ error: "Invalid email or password." }, { status: 401 });
    const token = signSession(user.id, user.role); if (!token) return Response.json({ error: "Authentication is unavailable." }, { status: 503 });
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(token) } });
  } catch (error) {
    console.error("Login failed.", error);
    return Response.json({ error: "Database is unavailable. Check the PostgreSQL settings and try again." }, { status: 503 });
  }
}
