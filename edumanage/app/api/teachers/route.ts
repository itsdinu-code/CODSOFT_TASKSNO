import { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  isOneOf,
  optionalText,
  readJson,
  requiredText,
} from "../../lib/academic-api";

const teacherStatuses = ["ACTIVE", "ON_LEAVE", "INACTIVE"] as const;

function teacherPayload(body: Record<string, unknown>) {
  const employeeNumber = requiredText(body, "employeeNumber", "Employee number", 30);
  const firstName = requiredText(body, "firstName", "First name", 80);
  const lastName = requiredText(body, "lastName", "Last name", 80);
  const email = requiredText(body, "email", "Email", 254)?.toLowerCase();
  const phone = optionalText(body, "phone", 40);
  const designation = optionalText(body, "designation", 120);
  const status = body.status === undefined ? "ACTIVE" : body.status;
  if (!employeeNumber || !firstName || !lastName || !email) return { error: "Complete all required teacher fields." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (phone === undefined || designation === undefined) return { error: "Check the phone and designation values." };
  if (!isOneOf(status, teacherStatuses)) return { error: "Choose a valid teacher status." };
  return { data: { employeeNumber, firstName, lastName, email, phone, designation, status } };
}

export async function GET() {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  try {
    const data = await getPrismaClient().teacher.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        designation: true,
        status: true,
        assignments: {
          select: {
            classroom: { select: { grade: true, section: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });
    return Response.json({ data, source: "database" });
  } catch (error) {
    return handlePrismaError(error, "load teachers");
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = teacherPayload(body);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const data = await getPrismaClient().teacher.create({ data: parsed.data!, select: { id: true } });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "That employee number or email is already in use." }, { status: 409 });
    }
    return handlePrismaError(error, "create teacher");
  }
}

export { teacherPayload, teacherStatuses };
