import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
  validAmount,
} from "../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };
const recordInclude = {
  student: { select: { id: true, firstName: true, lastName: true } },
  classroom: { select: { id: true, grade: true, section: true } },
  subject: { select: { id: true, name: true, code: true } },
};

export async function GET(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    const data = await getPrismaClient().academicRecord.findUnique({ where: { id }, include: recordInclude });
    return data
      ? Response.json({ data, source: "database" })
      : Response.json({ error: "Academic record not found." }, { status: 404 });
  } catch (error) {
    return handlePrismaError(error, "load academic record");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const { id } = await params;
  const data: {
    studentId?: string;
    classroomId?: string;
    subjectId?: string;
    academicYear?: string;
    term?: string;
    score?: number;
    maxScore?: number;
    grade?: string | null;
    remarks?: string | null;
  } = {};
  for (const key of ["studentId", "classroomId", "subjectId", "academicYear", "term"] as const) {
    if (key in body) {
      const value = requiredText(body, key, key, key === "academicYear" || key === "term" ? 40 : 100);
      if (!value) return invalid(`A valid ${key} is required.`);
      data[key] = value;
    }
  }
  if ("score" in body) {
    const value = validAmount(body.score, true);
    if (value === null) return invalid("Score must be a non-negative number.");
    data.score = value;
  }
  if ("maxScore" in body) {
    const value = validAmount(body.maxScore);
    if (value === null) return invalid("Maximum score must be greater than zero.");
    data.maxScore = value;
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
    const current = await prisma.academicRecord.findUnique({
      where: { id },
      select: { studentId: true, classroomId: true, score: true, maxScore: true },
    });
    if (!current) return Response.json({ error: "Academic record not found." }, { status: 404 });
    const studentId = data.studentId ?? current.studentId;
    const classroomId = data.classroomId ?? current.classroomId;
    const score = data.score ?? Number(current.score);
    const maxScore = data.maxScore ?? Number(current.maxScore);
    if (score > maxScore) return invalid("Score cannot exceed the maximum score.");
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classroomId: true },
    });
    if (!student || student.classroomId !== classroomId) {
      return invalid("The selected student must belong to the selected class.");
    }
    const saved = await prisma.academicRecord.update({ where: { id }, data, include: recordInclude });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update academic record");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().academicRecord.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete academic record");
  }
}
