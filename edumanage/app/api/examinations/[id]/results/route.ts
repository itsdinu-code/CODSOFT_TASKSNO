import { getPrismaClient } from "../../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
  validAmount,
} from "../../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const studentId = requiredText(body, "studentId", "Student ID", 100);
  const score = validAmount(body.score, true);
  const grade = optionalText(body, "grade", 20);
  const remarks = optionalText(body, "remarks", 500);
  if (!studentId || score === null || grade === undefined || remarks === undefined) {
    return invalid("Choose a student, enter a non-negative score, and use grade/remarks fields of at most 20/500 characters.");
  }

  try {
    const prisma = getPrismaClient();
    const { id: examId } = await params;
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { classroomId: true, maxScore: true },
    });
    if (!exam) return Response.json({ error: "Examination not found." }, { status: 404 });
    if (score > Number(exam.maxScore)) return invalid("Result score cannot exceed the exam maximum score.");
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classroomId: true },
    });
    if (!student || student.classroomId !== exam.classroomId) {
      return invalid("The selected student must belong to the examination class.");
    }
    const data = await prisma.examResult.create({
      data: { examId, studentId, score, grade, remarks },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "create examination result");
  }
}
