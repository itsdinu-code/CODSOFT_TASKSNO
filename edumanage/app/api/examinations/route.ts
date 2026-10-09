import { getPrismaClient } from "../../lib/prisma";
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
} from "../../lib/academic-api";

const examTypes = ["QUIZ", "ASSIGNMENT", "MIDTERM", "FINAL"] as const;
const examInclude = {
  classroom: { select: { id: true, grade: true, section: true, academicYear: true } },
  subject: { select: { id: true, name: true, code: true } },
  results: {
    orderBy: { createdAt: "desc" as const },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
  },
};

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const data = await getPrismaClient().exam.findMany({
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: examInclude,
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "load examinations");
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const title = requiredText(body, "title", "Title", 160);
  const type = body.type;
  const subjectId = requiredText(body, "subjectId", "Subject ID", 100);
  const classroomId = requiredText(body, "classroomId", "Class ID", 100);
  const startsAt = validDate(body.startsAt);
  const maxScore = validAmount(body.maxScore);
  const description = optionalText(body, "description", 1000);
  if (
    !title ||
    !isOneOf(type, examTypes) ||
    !subjectId ||
    !classroomId ||
    !startsAt ||
    maxScore === null ||
    description === undefined
  ) {
    return invalid("Enter an exam title, type, subject, class, date, positive maximum score, and a description of at most 1,000 characters.");
  }
  try {
    const data = await getPrismaClient().exam.create({
      data: { title, type, subjectId, classroomId, startsAt, maxScore, description },
      include: examInclude,
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "create examination");
  }
}
