import { Prisma } from "../../generated/prisma/client";

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJson(request: Request): Promise<JsonObject | Response> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!isJsonObject(value)) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  return value;
}

export function requiredText(
  body: JsonObject,
  key: string,
  label: string,
  maxLength = 200,
): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function optionalText(
  body: JsonObject,
  key: string,
  maxLength = 1000,
): string | null | undefined {
  const value = body[key];
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed || null : undefined;
}

export function validDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validAmount(
  value: unknown,
  allowZero = false,
  maximum = 99999.99,
): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const amount = Number(value);
  if (
    !Number.isFinite(amount) ||
    amount > maximum ||
    amount < 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) return null;
  if (!allowZero && amount === 0) return null;
  return amount;
}

export function isOneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T {
  return typeof value === "string" && choices.some((choice) => choice === value);
}

export function databaseUnavailable() {
  const configured = Boolean(process.env.DATABASE_URL);
  return Response.json(
    {
      error: configured
        ? "The database could not be reached. Check that PostgreSQL is running and DATABASE_URL is correct."
        : "DATABASE_URL is not configured. Add your PostgreSQL connection string to edumanage/.env.",
      code: configured ? "DATABASE_UNAVAILABLE" : "DATABASE_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

export function handlePrismaError(error: unknown, operation: string): Response {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return Response.json({ error: "A record with those unique values already exists." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return Response.json({ error: "The requested record was not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return Response.json({ error: "A referenced student, class, subject, or record does not exist." }, { status: 400 });
    }
  }
  console.error(`Failed to ${operation} in PostgreSQL.`, error);
  return databaseUnavailable();
}

export function invalid(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
