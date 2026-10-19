import { Prisma } from "../../../../generated/prisma/client";
import { registerSchema } from "../../../lib/auth-validation";
import { authConfigured, hashPassword, sessionCookieHeader, signSession } from "../../../lib/auth";
import { getPrismaClient } from "../../../lib/prisma";
export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid registration details." }, { status: 400 });
  if (!process.env.DATABASE_URL || !authConfigured()) return Response.json({ error: "Registration is unavailable." }, { status: 503 });
  try {
    const prisma = getPrismaClient();
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    const user = await prisma.user.create({ data: { email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: admins === 0 ? "ADMIN" : "STUDENT" }, select: { id: true, role: true } });
    const token = signSession(user.id, user.role); if (!token) return Response.json({ error: "Registration is unavailable." }, { status: 503 });
    return Response.json({ ok: true }, { status: 201, headers: { "Set-Cookie": sessionCookieHeader(token) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Registration failed.", error);
    return Response.json({ error: "Database is unavailable. Check the PostgreSQL settings and try again." }, { status: 503 });
  }
}
