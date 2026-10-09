import { Prisma } from "../../../generated/prisma/client";
import { connection } from "next/server";
import { getPrismaClient } from "../../lib/prisma";
import { databaseUnavailable, handlePrismaError } from "../../lib/academic-api";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  await connection();
  if (!process.env.DATABASE_URL) return databaseUnavailable();

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const nextYear = new Date(Date.UTC(year + 1, 0, 1));
    const monthParam = new URL(request.url).searchParams.get("month");
    const monthMatch = monthParam ? /^(\d{4})-(\d{2})$/.exec(monthParam) : null;
    const requestedYear = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
    const requestedMonth = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1;
    if (
      monthParam &&
      (!monthMatch || requestedYear < 1900 || requestedYear > 3000 || requestedMonth < 1 || requestedMonth > 12)
    ) {
      return Response.json({ error: "Month must use the YYYY-MM format." }, { status: 400 });
    }
    const monthStart = new Date(Date.UTC(requestedYear, requestedMonth - 1, 1));
    const nextMonth = new Date(Date.UTC(requestedYear, requestedMonth, 1));

    const [
      studentCount,
      teacherCount,
      attendanceGroups,
      teachers,
      monthlyInvoices,
      monthlyPayments,
      dueFees,
      exams,
      invoices,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.attendance.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ assignments: { _count: "desc" } }, { lastName: "asc" }, { firstName: "asc" }],
        take: 6,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          designation: true,
          assignments: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { subject: { select: { name: true } } },
          },
        },
      }),
      prisma.$queryRaw<Array<{ month: number; total: string }>>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month,
               COALESCE(SUM("amount"), 0)::text AS total
        FROM "FeeInvoice"
        WHERE "createdAt" >= ${yearStart} AND "createdAt" < ${nextYear}
        GROUP BY EXTRACT(MONTH FROM "createdAt")
      `),
      prisma.$queryRaw<Array<{ month: number; total: string }>>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM "paidAt")::int AS month,
               COALESCE(SUM("amount"), 0)::text AS total
        FROM "FeePayment"
        WHERE "paidAt" >= ${yearStart} AND "paidAt" < ${nextYear}
        GROUP BY EXTRACT(MONTH FROM "paidAt")
      `),
      prisma.$queryRaw<Array<{ total: string }>>(Prisma.sql`
        SELECT COALESCE(SUM(GREATEST(invoice."amount" - COALESCE(payment.paid, 0), 0)), 0)::text AS total
        FROM "FeeInvoice" AS invoice
        LEFT JOIN (
          SELECT "invoiceId", SUM("amount") AS paid
          FROM "FeePayment"
          GROUP BY "invoiceId"
        ) AS payment ON payment."invoiceId" = invoice."id"
      `),
      prisma.exam.findMany({
        where: { startsAt: { gte: monthStart, lt: nextMonth } },
        orderBy: { startsAt: "asc" },
        take: 100,
        select: {
          id: true,
          title: true,
          type: true,
          startsAt: true,
          subject: { select: { name: true } },
          classroom: { select: { grade: true, section: true } },
        },
      }),
      prisma.feeInvoice.findMany({
        where: {
          dueDate: { gte: monthStart, lt: nextMonth },
          status: { not: "PAID" },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          amount: true,
          student: { select: { firstName: true, lastName: true } },
          payments: { select: { amount: true } },
        },
      }),
    ]);

    const markedAttendance = attendanceGroups.reduce((total, group) => total + group._count._all, 0);
    const attended = attendanceGroups
      .filter((group) => group.status === "PRESENT" || group.status === "LATE")
      .reduce((total, group) => total + group._count._all, 0);
    const outstanding = Number(dueFees[0]?.total ?? 0);
    const invoiceByMonth = new Map(monthlyInvoices.map((row) => [row.month, Number(row.total)]));
    const paymentByMonth = new Map(monthlyPayments.map((row) => [row.month, Number(row.total)]));
    const revenue = monthNames.map((month, index) => ({
      month,
      invoiced: invoiceByMonth.get(index + 1) ?? 0,
      collected: paymentByMonth.get(index + 1) ?? 0,
    }));

    const events = [
      ...exams.map((exam) => ({
        id: `exam-${exam.id}`,
        kind: "exam" as const,
        date: exam.startsAt.toISOString(),
        title: exam.title,
        detail: `${exam.subject.name} · Grade ${exam.classroom.grade}${exam.classroom.section}`,
      })),
      ...invoices
        .map((invoice) => ({
          ...invoice,
          balance: Math.max(
            0,
            Number(invoice.amount) - invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
          ),
        }))
        .filter((invoice) => invoice.balance > 0)
        .map((invoice) => ({
          id: `fee-${invoice.id}`,
          kind: "fee" as const,
          date: invoice.dueDate.toISOString(),
          title: `Fee due · ${invoice.student.firstName} ${invoice.student.lastName}`,
          detail: `${invoice.invoiceNumber} · ₹${invoice.balance.toLocaleString("en-IN")}`,
        })),
    ].sort((left, right) => left.date.localeCompare(right.date));

    const calendarDots = events.reduce<Record<string, number>>((days, event) => {
      const key = event.date.slice(0, 10);
      days[key] = (days[key] ?? 0) + 1;
      return days;
    }, {});

    return Response.json({
      data: {
        generatedAt: now.toISOString(),
        calendarMonth: monthStart.toISOString(),
        metrics: {
          students: studentCount,
          teachers: teacherCount,
          attendance: markedAttendance ? (attended / markedAttendance) * 100 : null,
          dueFees: outstanding,
        },
        revenue,
        teachers,
        events: events.slice(0, 100),
        calendarDots,
      },
      source: "database",
    });
  } catch (error) {
    return handlePrismaError(error, "load dashboard overview");
  }
}
