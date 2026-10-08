import { randomUUID } from "node:crypto";
import { Prisma, type StudentStatus as PrismaStudentStatus } from "../../../generated/prisma/client";
import type { Student, StudentStatus } from "../../data";
import { getPrismaClient } from "../../lib/prisma";

const avatarColors = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
];

function toUiStatus(status: PrismaStudentStatus): StudentStatus {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "ON_LEAVE":
      return "On leave";
    case "PENDING":
      return "Pending";
    case "GRADUATED":
      return "Graduated";
  }
}

function toStudent(
  record: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    classroom: { grade: number; section: string } | null;
    status: PrismaStudentStatus;
  },
  attendance: string,
  index: number,
): Student {
  const name = `${record.firstName} ${record.lastName}`;

  return {
    id: record.id,
    name,
    initials: `${record.firstName[0] ?? ""}${record.lastName[0] ?? ""}`.toUpperCase(),
    className: record.classroom
      ? `Grade ${record.classroom.grade} · Section ${record.classroom.section}`
      : "Unassigned",
    email: record.email ?? "",
    attendance,
    status: toUiStatus(record.status),
    avatarColor: avatarColors[index % avatarColors.length],
  };
}

function databaseUnavailable() {
  return Response.json(
    {
      error: process.env.DATABASE_URL
        ? "The database could not be reached. Check that PostgreSQL is running and DATABASE_URL is correct."
        : "DATABASE_URL is not configured. Add your PostgreSQL connection string to edumanage/.env.",
      code: process.env.DATABASE_URL ? "DATABASE_UNAVAILABLE" : "DATABASE_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return databaseUnavailable();
  }

  try {
    const prisma = getPrismaClient();
    const records = await prisma.student.findMany({
      orderBy: [{ createdAt: "desc" }, { lastName: "asc" }],
      take: 250,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        classroom: { select: { grade: true, section: true } },
      },
    });

    const studentIds = records.map((record) => record.id);
    const attendanceCounts = studentIds.length
      ? await prisma.attendance.groupBy({
          by: ["studentId", "status"],
          where: {
            studentId: { in: studentIds },
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _count: { _all: true },
        })
      : [];

    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    for (const row of attendanceCounts) {
      const counts = attendanceByStudent.get(row.studentId) ?? { present: 0, total: 0 };
      const count = row._count._all;
      counts.total += count;
      if (row.status === "PRESENT" || row.status === "LATE") {
        counts.present += count;
      }
      attendanceByStudent.set(row.studentId, counts);
    }

    const data = records.map((record, index) => {
      const counts = attendanceByStudent.get(record.id);
      const attendance =
        counts && counts.total > 0
          ? `${Math.round((counts.present / counts.total) * 100)}%`
          : "—";
      return toStudent(record, attendance, index);
    });

    return Response.json({ data, source: "database" });
  } catch (error) {
    console.error("Failed to load students from PostgreSQL.", error);
    return databaseUnavailable();
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return databaseUnavailable();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const className = typeof payload.className === "string" ? payload.className.trim() : "";
  const classMatch = /^Grade (\d{1,2}) · Section ([A-Za-z])$/.exec(className);
  const nameParts = name.split(/\s+/).filter(Boolean);

  if (name.length < 2 || name.length > 100 || nameParts.length < 2) {
    return Response.json({ error: "Enter the student’s first and last name." }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!classMatch) {
    return Response.json({ error: "Choose a valid grade and section." }, { status: 400 });
  }

  const [firstName, ...lastNameParts] = nameParts;
  const lastName = lastNameParts.join(" ");
  const grade = Number(classMatch[1]);
  const section = classMatch[2].toUpperCase();
  const academicYear = "2025-2026";

  try {
    const prisma = getPrismaClient();
    const classroom = await prisma.classroom.upsert({
      where: { grade_section_academicYear: { grade, section, academicYear } },
      update: {},
      create: { grade, section, academicYear },
    });

    const record = await prisma.student.create({
      data: {
        admissionNumber: `ADM-${randomUUID()}`,
        firstName,
        lastName,
        email,
        classroomId: classroom.id,
        status: "ACTIVE",
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

    return Response.json(
      { data: toStudent(record, "—", 0), source: "database" },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "A student with this email address already exists." },
        { status: 409 },
      );
    }

    console.error("Failed to create student in PostgreSQL.", error);
    return databaseUnavailable();
  }
}
