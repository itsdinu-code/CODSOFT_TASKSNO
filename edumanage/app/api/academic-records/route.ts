import { getPrismaClient } from "../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
  validAmount,
} from "../../lib/academic-api";

const recordInclude = {
  student: { select: { id: true, firstName: true, lastName: true } },
  classroom: { select: { id: true, grade: true, section: true } },
  subject: { select: { id: true, name: true, code: true } },
};

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const data = await getPrismaClient().academicRecord.findMany({
      orderBy: [{ academicYear: "desc" }, { term: "asc" }, { createdAt: "desc" }],
      take: 500,
      include: recordInclude,
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "load academic records");
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const studentId = requiredText(body, "studentId", "Student ID", 100);
  const classroomId = requiredText(body, "classroomId", "Class ID", 100);
  const subjectId = requiredText(body, "subjectId", "Subject ID", 100);
  const academicYear = requiredText(body, "academicYear", "Academic year", 20);
  const term = requiredText(body, "term", "Term", 40);
  const score = validAmount(body.score, true);
  const maxScore = validAmount(body.maxScore);
  const grade = optionalText(body, "grade", 20);
  const remarks = optionalText(body, "remarks", 500);
  if (
    !studentId ||
    !classroomId ||
    !subjectId ||
    !academicYear ||
    !term ||
    score === null ||
    maxScore === null ||
    grade === undefined ||
    remarks === undefined
  ) {
    return invalid("Select a student, class, and subject; enter an academic year, term, score, and positive maximum score.");
  }
  if (score > maxScore) return invalid("Score cannot exceed the maximum score.");

  try {
    const prisma = getPrismaClient();
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classroomId: true },
    });
    if (!student || student.classroomId !== classroomId) {
      return invalid("The selected student must belong to the selected class.");
    }
    const data = await prisma.academicRecord.create({
      data: {
        studentId,
        classroomId,
        subjectId,
        academicYear,
        term,
        score,
        maxScore,
        grade,
        remarks,
      },
      include: recordInclude,
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "create academic record");
  }
}
