import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  isOneOf,
  optionalText,
  readJson,
  requiredText,
  validDate,
} from "../../../lib/academic-api";

const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type RouteContext = { params: Promise<{ id: string }> };

const include = {
  student: { select: { id: true, firstName: true, lastName: true } },
  classroom: { select: { id: true, grade: true, section: true } },
};

export async function GET(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    const data = await getPrismaClient().attendance.findUnique({ where: { id }, include });
    return data
      ? Response.json({ data, source: "database" })
      : Response.json({ error: "Attendance record not found." }, { status: 404 });
  } catch (error) {
    return handlePrismaError(error, "load attendance");
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
    date?: Date;
    status?: (typeof statuses)[number];
    note?: string | null;
  } = {};

  if ("studentId" in body) {
    const value = requiredText(body, "studentId", "Student ID", 100);
    if (!value) return invalid("Choose a valid student.");
    data.studentId = value;
  }
  if ("classroomId" in body) {
    const value = requiredText(body, "classroomId", "Class ID", 100);
    if (!value) return invalid("Choose a valid class.");
    data.classroomId = value;
  }
  if ("date" in body) {
    const value = validDate(body.date);
    if (!value) return invalid("Choose a valid date.");
    data.date = value;
  }
  if ("status" in body) {
    if (!isOneOf(body.status, statuses)) return invalid("Choose a valid attendance status.");
    data.status = body.status;
  }
  if ("note" in body) {
    const value = optionalText(body, "note", 500);
    if (value === undefined) return invalid("Attendance notes must be 500 characters or fewer.");
    data.note = value;
  }
  if (!Object.keys(data).length) return invalid("Provide at least one field to update.");

  try {
    const prisma = getPrismaClient();
    const existing = await prisma.attendance.findUnique({ where: { id }, select: { studentId: true, classroomId: true } });
    if (!existing) return Response.json({ error: "Attendance record not found." }, { status: 404 });
    const studentId = data.studentId ?? existing.studentId;
    const classroomId = data.classroomId ?? existing.classroomId;
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classroomId: true } });
    if (!student || student.classroomId !== classroomId) {
      return invalid("The selected student must belong to the selected class.");
    }
    const saved = await prisma.attendance.update({ where: { id }, data, include });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update attendance");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().attendance.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete attendance");
  }
}
