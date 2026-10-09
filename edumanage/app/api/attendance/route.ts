import { getPrismaClient } from "../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  isOneOf,
  optionalText,
  readJson,
  requiredText,
  validDate,
} from "../../lib/academic-api";

const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const data = await getPrismaClient().attendance.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, grade: true, section: true } },
      },
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "load attendance");
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const studentId = requiredText(body, "studentId", "Student ID", 100);
  const classroomId = requiredText(body, "classroomId", "Class ID", 100);
  const date = validDate(body.date);
  const status = body.status;
  const note = optionalText(body, "note", 500);
  if (!studentId || !classroomId || !date || !isOneOf(status, statuses) || note === undefined) {
    return invalid("Choose a student, class, valid date, attendance status, and a note of at most 500 characters.");
  }

  try {
    const prisma = getPrismaClient();
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classroomId: true },
    });
    if (!student || student.classroomId !== classroomId) {
      return invalid("The selected student must belong to the selected class.");
    }
    const data = await prisma.attendance.create({
      data: { studentId, classroomId, date, status, note },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, grade: true, section: true } },
      },
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "create attendance");
  }
}
