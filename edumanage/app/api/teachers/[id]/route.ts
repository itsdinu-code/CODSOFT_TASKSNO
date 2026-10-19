import { requireSession } from "../../../lib/auth";
import { Prisma } from "../../../../generated/prisma/client";
import { getPrismaClient } from "../../../lib/prisma";
import { teacherPayload } from "../../../lib/teacher-payload";
import { databaseUnavailable, handlePrismaError, readJson, validId } from "../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = requireSession(request);
  if (session instanceof Response) return session;
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = teacherPayload(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const { id: rawId } = await params;
    const id = validId(rawId);
    if (!id) return Response.json({ error: "Invalid record id." }, { status: 400 });
    const teacher = parsed.data;
    const data = await getPrismaClient().teacher.update({
      where: { id },
      data: teacher,
      select: { id: true },
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "That employee number or email is already in use." }, { status: 409 });
    }
    return handlePrismaError(error, "update teacher");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = requireSession(request);
  if (session instanceof Response) return session;
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id: rawId } = await params;
    const id = validId(rawId);
    if (!id) return Response.json({ error: "Invalid record id." }, { status: 400 });
    await getPrismaClient().teacher.delete({ where: { id } });
    return Response.json({ data: { id }, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "delete teacher");
  }
}
