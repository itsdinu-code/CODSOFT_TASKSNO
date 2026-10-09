import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
  validAmount,
  validDate,
} from "../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };
const feeInclude = {
  student: { select: { id: true, firstName: true, lastName: true } },
  payments: { orderBy: { paidAt: "desc" as const } },
};

function invoiceStatus(amount: number, paid: number, dueDate: Date) {
  if (paid >= amount) return "PAID" as const;
  if (paid > 0) return "PARTIALLY_PAID" as const;
  return dueDate.getTime() < Date.now() ? "OVERDUE" as const : "PENDING" as const;
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    const data = await getPrismaClient().feeInvoice.findUnique({ where: { id }, include: feeInclude });
    return data
      ? Response.json({ data, source: "database" })
      : Response.json({ error: "Fee invoice not found." }, { status: 404 });
  } catch (error) {
    return handlePrismaError(error, "load fee invoice");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const { id } = await params;
  const data: {
    studentId?: string;
    academicYear?: string;
    term?: string;
    description?: string | null;
    amount?: number;
    dueDate?: Date;
  } = {};
  if ("studentId" in body) {
    const value = requiredText(body, "studentId", "Student ID", 100);
    if (!value) return invalid("Choose a valid student.");
    data.studentId = value;
  }
  if ("academicYear" in body) {
    const value = requiredText(body, "academicYear", "Academic year", 20);
    if (!value) return invalid("Enter a valid academic year.");
    data.academicYear = value;
  }
  if ("term" in body) {
    const value = requiredText(body, "term", "Term", 40);
    if (!value) return invalid("Enter a valid term.");
    data.term = value;
  }
  if ("description" in body) {
    const value = optionalText(body, "description", 500);
    if (value === undefined) return invalid("Description must be 500 characters or fewer.");
    data.description = value;
  }
  if ("amount" in body) {
    const value = validAmount(body.amount, false, 99999999.99);
    if (value === null) return invalid("Invoice amount must be greater than zero.");
    data.amount = value;
  }
  if ("dueDate" in body) {
    const value = validDate(body.dueDate);
    if (!value) return invalid("Choose a valid due date.");
    data.dueDate = value;
  }
  if (!Object.keys(data).length) return invalid("Provide at least one field to update.");

  try {
    const prisma = getPrismaClient();
    const current = await prisma.feeInvoice.findUnique({
      where: { id },
      select: { amount: true, dueDate: true, payments: { select: { amount: true } } },
    });
    if (!current) return Response.json({ error: "Fee invoice not found." }, { status: 404 });
    const amount = data.amount ?? Number(current.amount);
    const paid = current.payments.reduce((total, payment) => total + Number(payment.amount), 0);
    if (amount < paid) return invalid("Invoice amount cannot be lower than the payments already recorded.");
    const dueDate = data.dueDate ?? current.dueDate;
    const saved = await prisma.feeInvoice.update({
      where: { id },
      data: { ...data, status: invoiceStatus(amount, paid, dueDate) },
      include: feeInclude,
    });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update fee invoice");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const { id } = await params;
    await getPrismaClient().feeInvoice.delete({ where: { id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete fee invoice");
  }
}
