import { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../../lib/prisma";
import {
  databaseUnavailable,
  handlePrismaError,
  invalid,
  optionalText,
  readJson,
  requiredText,
} from "../../lib/academic-api";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return databaseUnavailable();
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const code = requiredText(body, "code", "Subject code", 30)?.toUpperCase();
  const name = requiredText(body, "name", "Subject name", 120);
  const description = optionalText(body, "description", 500);
  if (!code || !/^[A-Z0-9][A-Z0-9_-]*$/.test(code) || !name || description === undefined) {
    return invalid("Enter a subject name, a code using letters/numbers/hyphens/underscores, and a description of at most 500 characters.");
  }
  try {
    const data = await getPrismaClient().subject.create({
      data: { code, name, description },
      select: { id: true, code: true, name: true },
    });
    return Response.json({ data, source: "database" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "A subject with this code already exists." }, { status: 409 });
    }
    return handlePrismaError(error, "create subject");
  }
}
