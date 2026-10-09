import { Prisma, type StudentStatus as PrismaStudentStatus } from "../../../../generated/prisma/client";
import { getPrismaClient } from "../../../lib/prisma";
import { databaseUnavailable, handlePrismaError, readJson } from "../../../lib/academic-api";

const statuses = ["ACTIVE", "ON_LEAVE", "PENDING", "GRADUATED"] as const;
type RouteContext = { params: Promise<{ id: string }> };

function parseStudent(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const parts = name.split(/\s+/).filter(Boolean);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const className = typeof body.className === "string" ? body.className.trim() : "";
  const classMatch = /^Grade (\d{1,2}) · Section ([A-Za-z])$/.exec(className);
  const status = body.status === undefined ? "ACTIVE" : body.status;

  if (parts.length < 2 || name.length > 100) return { error: "Enter the student’s first and last name." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!classMatch || Number(classMatch[1]) < 1 || Number(classMatch[1]) > 12) {
    return { error: "Choose a valid grade and section." };
  }
  if (!statuses.includes(status as (typeof statuses)[number])) return { error: "Choose a valid student status." };

  return {
    data: {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
      email,
      grade: Number(classMatch[1]),
      section: classMatch[2].toUpperCase(),
      status: status as PrismaStudentStatus,
    },
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = parseStudent(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const { id } = await params;
    const prisma = getPrismaClient();
    const student = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.upsert({
        where: {
          grade_section_academicYear: {
            grade: student.grade,
            section: student.section,
            academicYear: "2025-2026",
          },
        },
        update: {},
        create: {
          grade: student.grade,
          section: student.section,
          academicYear: "2025-2026",
        },
        select: { id: true },
      });
      return tx.student.update({
        where: { id },
        data: {
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          classroomId: classroom.id,
          status: student.status,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          classroom: { select: { grade: true, section: true } },
        },
      });
    });
    return Response.json({ data: result, source: "database" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "A student with this email address already exists." }, { status: 409 });
    }
    return handlePrismaError(error, "update student");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().student.delete({ where: { id } });
    return Response.json({ data: { id }, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "delete student");
  }
}
