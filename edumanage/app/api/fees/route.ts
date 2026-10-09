import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
  validAmount,
  validDate,
} from "../../lib/academic-api";

const feeInclude = {
  student: { select: { id: true, firstName: true, lastName: true } },
  payments: { orderBy: { paidAt: "desc" as const } },
};

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const data = await getPrismaClient().feeInvoice.findMany({
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: feeInclude,
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "load fee invoices");
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const studentId = requiredText(body, "studentId", "Student ID", 100);
  const academicYear = requiredText(body, "academicYear", "Academic year", 20);
  const term = requiredText(body, "term", "Term", 40);
  const amount = validAmount(body.amount, false, 99999999.99);
  const dueDate = validDate(body.dueDate);
  const description = optionalText(body, "description", 500);
  if (!studentId || !academicYear || !term || amount === null || !dueDate || description === undefined) {
    return invalid("Choose a student, enter an academic year, term, positive amount, due date, and description of at most 500 characters.");
  }

  try {
    const data = await getPrismaClient().feeInvoice.create({
      data: {
        invoiceNumber: `INV-${randomUUID()}`,
        studentId,
        academicYear,
        term,
        amount,
        dueDate,
        description,
        status: dueDate.getTime() < Date.now() ? "OVERDUE" : "PENDING",
      },
      include: feeInclude,
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "create fee invoice");
  }
}
