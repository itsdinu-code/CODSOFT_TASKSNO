import { getPrismaClient } from "../../../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  isOneOf,
  optionalText,
  readJson,
  validAmount,
} from "../../../../lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };
const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "ONLINE"] as const;

function invoiceStatus(amount: number, paid: number, dueDate: Date) {
  if (paid >= amount) return "PAID" as const;
  if (paid > 0) return "PARTIALLY_PAID" as const;
  return dueDate.getTime() < Date.now() ? "OVERDUE" as const : "PENDING" as const;
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const amount = validAmount(body.amount, false, 99999999.99);
  const method = body.method;
  const note = optionalText(body, "note", 500);
  if (amount === null || !isOneOf(method, paymentMethods) || note === undefined) {
    return invalid("Enter a positive payment amount, choose a payment method, and provide an optional note of at most 500 characters.");
  }
  try {
    const { id: invoiceId } = await params;
    const data = await getPrismaClient().$transaction(async (transaction) => {
      const invoice = await transaction.feeInvoice.findUnique({
        where: { id: invoiceId },
        select: { amount: true, dueDate: true, payments: { select: { amount: true } } },
      });
      if (!invoice) return null;
      const paidSoFar = invoice.payments.reduce((total, payment) => total + Number(payment.amount), 0);
      if (amount > Number(invoice.amount) - paidSoFar + 0.00001) {
        throw new Error("PAYMENT_EXCEEDS_BALANCE");
      }
      const payment = await transaction.feePayment.create({
        data: { invoiceId, amount, method, note },
      });
      const totalPaid = paidSoFar + amount;
      await transaction.feeInvoice.update({
        where: { id: invoiceId },
        data: { status: invoiceStatus(Number(invoice.amount), totalPaid, invoice.dueDate) },
      });
      return payment;
    });
    if (!data) return Response.json({ error: "Fee invoice not found." }, { status: 404 });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") {
      return invalid("Payment amount cannot exceed the outstanding invoice balance.");
    }
    return handlePrismaError(error, "record fee payment");
  }
}
