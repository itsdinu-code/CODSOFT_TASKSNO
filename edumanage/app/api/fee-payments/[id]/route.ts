import { getPrismaClient } from "../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  isOneOf,
  optionalText,
  readJson,
  validAmount,
} from "../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };
const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "ONLINE"] as const;

function invoiceStatus(amount: number, paid: number, dueDate: Date) {
  if (paid >= amount) return "PAID" as const;
  if (paid > 0) return "PARTIALLY_PAID" as const;
  return dueDate.getTime() < Date.now() ? "OVERDUE" as const : "PENDING" as const;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const data: { amount?: number; method?: (typeof paymentMethods)[number]; note?: string | null } = {};
  if ("amount" in body) {
    const value = validAmount(body.amount, false, 99999999.99);
    if (value === null) return invalid("Payment amount must be greater than zero.");
    data.amount = value;
  }
  if ("method" in body) {
    if (!isOneOf(body.method, paymentMethods)) return invalid("Choose a valid payment method.");
    data.method = body.method;
  }
  if ("note" in body) {
    const value = optionalText(body, "note", 500);
    if (value === undefined) return invalid("Payment note must be 500 characters or fewer.");
    data.note = value;
  }
  if (!Object.keys(data).length) return invalid("Provide at least one field to update.");

  try {
    const prisma = getPrismaClient();
    const { id } = await params;
    const current = await prisma.feePayment.findUnique({
      where: { id },
      select: {
        invoiceId: true,
        amount: true,
        invoice: { select: { amount: true, dueDate: true, payments: { select: { id: true, amount: true } } } },
      },
    });
    if (!current) return Response.json({ error: "Fee payment not found." }, { status: 404 });
    const paid = current.invoice.payments.reduce(
      (total, payment) => total + (payment.id === id ? (data.amount ?? Number(current.amount)) : Number(payment.amount)),
      0,
    );
    if (paid > Number(current.invoice.amount)) return invalid("Updated payment exceeds the outstanding invoice balance.");
    const saved = await prisma.$transaction(async (transaction) => {
      const payment = await transaction.feePayment.update({ where: { id }, data });
      await transaction.feeInvoice.update({
        where: { id: current.invoiceId },
        data: { status: invoiceStatus(Number(current.invoice.amount), paid, current.invoice.dueDate) },
      });
      return payment;
    });
    return Response.json({ data: saved, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "update fee payment");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const prisma = getPrismaClient();
    const { id } = await params;
    const payment = await prisma.feePayment.findUnique({
      where: { id },
      select: { invoiceId: true, invoice: { select: { amount: true, dueDate: true, payments: { select: { id: true, amount: true } } } } },
    });
    if (!payment) return Response.json({ error: "Fee payment not found." }, { status: 404 });
    const remaining = payment.invoice.payments
      .filter((item) => item.id !== id)
      .reduce((total, item) => total + Number(item.amount), 0);
    await prisma.$transaction(async (transaction) => {
      await transaction.feePayment.delete({ where: { id } });
      await transaction.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: invoiceStatus(Number(payment.invoice.amount), remaining, payment.invoice.dueDate) },
      });
    });
    return Response.json({ deleted: true });
  } catch (error) {
    return handlePrismaError(error, "delete fee payment");
  }
}
