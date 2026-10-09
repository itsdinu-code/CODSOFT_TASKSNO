import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  validAmount,
} from "../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const data: { score?: number; grade?: string | null; remarks?: string | null } = {};
  if ("score" in body) {
    const value = validAmount(body.score, true);
    if (value === null) return invalid("Score must be a non-negative number.");
    data.score = value;
  }
  if ("grade" in body) {
    const value = optionalText(body, "grade", 20);
    if (value === undefined) return invalid("Grade must be 20 characters or fewer.");
    data.grade = value;
  }
  if ("remarks" in body) {
    const value = optionalText(body, "remarks", 500);
    if (value === undefined) return invalid("Remarks must be 500 characters or fewer.");
    data.remarks = value;
  }
  if (!Object.keys(data).length) return invalid("Provide at least one field to update.");
  try {
    const prisma = getPrismaClient();
    const { id } = await params;
    if (data.score !== undefined) {
      const existing = await prisma.examResult.findUnique({
        where: { id },
        select: { exam: { select: { maxScore: true } } },
      });
      if (!existing) return Response.json({ error: "Examination result not found." }, { status: 404 });
      if (data.score > Number(existing.exam.maxScore)) return invalid("Result score cannot exceed the exam maximum score.");
    }
    const saved = await prisma.examResult.update({
      where: { id },
      data,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update examination result");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().examResult.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete examination result");
  }
}
