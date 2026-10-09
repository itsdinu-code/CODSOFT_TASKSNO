import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  isOneOf,
  optionalText,
  readJson,
  requiredText,
  validAmount,
  validDate,
} from "../../../lib/academic-api";

const examTypes = ["QUIZ", "ASSIGNMENT", "MIDTERM", "FINAL"] as const;
type RouteContext = { params: Promise<{ id: string }> };
const examInclude = {
  classroom: { select: { id: true, grade: true, section: true, academicYear: true } },
  subject: { select: { id: true, name: true, code: true } },
  results: {
    orderBy: { createdAt: "desc" as const },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
  },
};

export async function GET(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    const data = await getPrismaClient().exam.findUnique({ where: { id }, include: examInclude });
    return data
      ? Response.json({ data, source: "database" })
      : Response.json({ error: "Examination not found." }, { status: 404 });
  } catch (error) {
    return handlePrismaError(error, "load examination");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const { id } = await params;
  const data: {
    title?: string;
    type?: (typeof examTypes)[number];
    subjectId?: string;
    classroomId?: string;
    startsAt?: Date;
    maxScore?: number;
    description?: string | null;
  } = {};
  if ("title" in body) {
    const value = requiredText(body, "title", "Title", 160);
    if (!value) return invalid("Exam title is required and must be 160 characters or fewer.");
    data.title = value;
  }
  if ("type" in body) {
    if (!isOneOf(body.type, examTypes)) return invalid("Choose a valid examination type.");
    data.type = body.type;
  }
  for (const key of ["subjectId", "classroomId"] as const) {
    if (key in body) {
      const value = requiredText(body, key, key, 100);
      if (!value) return invalid(`Choose a valid ${key === "subjectId" ? "subject" : "class"}.`);
      data[key] = value;
    }
  }
  if ("startsAt" in body) {
    const value = validDate(body.startsAt);
    if (!value) return invalid("Choose a valid exam date.");
    data.startsAt = value;
  }
  if ("maxScore" in body) {
    const value = validAmount(body.maxScore);
    if (value === null) return invalid("Maximum score must be greater than zero.");
    data.maxScore = value;
  }
  if ("description" in body) {
    const value = optionalText(body, "description", 1000);
    if (value === undefined) return invalid("Description must be 1,000 characters or fewer.");
    data.description = value;
  }
  if (!Object.keys(data).length) return invalid("Provide at least one field to update.");
  try {
    const prisma = getPrismaClient();
    const current = await prisma.exam.findUnique({
      where: { id },
      select: {
        maxScore: true,
        results: { select: { score: true, student: { select: { classroomId: true } } } },
      },
    });
    if (!current) return Response.json({ error: "Examination not found." }, { status: 404 });
    const nextMaxScore = data.maxScore ?? Number(current.maxScore);
    if (current.results.some((result) => Number(result.score) > nextMaxScore)) {
      return invalid("Maximum score cannot be lower than an existing student result.");
    }
    if (
      data.classroomId &&
      current.results.some((result) => result.student.classroomId !== data.classroomId)
    ) {
      return invalid("The class cannot be changed while results belong to students in the current class.");
    }
    const saved = await prisma.exam.update({ where: { id }, data, include: examInclude });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update examination");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().exam.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete examination");
  }
}
