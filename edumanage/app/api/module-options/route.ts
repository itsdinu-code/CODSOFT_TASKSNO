import { getPrismaClient } from "../../lib/prisma";
import { databaseUnavailable, handlePrismaError } from "../../lib/academic-api";

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const prisma = getPrismaClient();
    const [students, classrooms, subjects] = await Promise.all([
      prisma.student.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroomId: true,
          classroom: { select: { grade: true, section: true } },
        },
      }),
      prisma.classroom.findMany({
        orderBy: [{ grade: "asc" }, { section: "asc" }],
        select: { id: true, grade: true, section: true, academicYear: true },
      }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
    ]);
    return Response.json({ data: { students, classrooms, subjects } });
  } catch (error) {
    return handlePrismaError(error, "load module options");
  }
}
