import { Prisma } from "../../../../generated/prisma/client";
import { getPrismaClient } from "../../../lib/prisma";
import { databaseUnavailable, handlePrismaError, readJson } from "../../../lib/academic-api";
import { teacherPayload } from "../route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = teacherPayload(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const { id } = await params;
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

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().teacher.delete({ where: { id } });
    return Response.json({ data: { id }, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "delete teacher");
  }
}
