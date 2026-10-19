import { Prisma } from "../../generated/prisma/client";

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Sanitization: Prisma parameterizes every query (no SQL injection), but
// stored values render in the UI — strip control chars and reject HTML/script
// payloads at the gate instead of storing them.
// ---------------------------------------------------------------------------
function cleanText(value: string): string {
  return Array.from(value).filter(isKeepableChar).join(String.fromCharCode(34).slice(1));
}

function isKeepableChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127 && code < 65534);
}
function tagFound(hay: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at < 0) return false;
    const nx = hay.charAt(at + needle.length);
    if (nx.length === 0) return true;
    if (nx === String.fromCharCode(62) || nx === String.fromCharCode(47)) return true;
    from = at + 1;
  }
}
function containsDangerTag(lower: string): boolean {
  const noSpace = lower.split(String.fromCharCode(32)).join('');
  const tags = ['script','iframe','object','embed','form','img','svg','link','style','meta','base'];
  const lt = String.fromCharCode(60);
  for (const t of tags) {
    if (tagFound(noSpace, lt + t) || tagFound(noSpace, lt + String.fromCharCode(47) + t)) return true;
  }
  return false;
}

function looksLikeHtmlInjection(value: string): boolean {
  return containsDangerTag(value.toLowerCase());
}

// CUID route ids (Prisma default) — rejects path-traversal / injection probes.
export function validId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-z0-9]{10,64}$/i.test(trimmed) ? trimmed : null;
}


function checkEmailShape(v: string): boolean {
  if (v.indexOf(String.fromCharCode(32)) >= 0) return false;
  const at = v.indexOf(String.fromCharCode(64));
  if (at <= 0 || at !== v.lastIndexOf(String.fromCharCode(64))) return false;
  const dom = v.slice(at + 1);
  const dot = dom.indexOf(String.fromCharCode(46));
  return dot > 0 && dot < dom.length - 1;
}

export function validEmail(value: unknown, maxLength = 254): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return checkEmailShape(trimmed) ? trimmed : null;
}

// Strict YYYY-(YYYY+1) academic-year label, e.g. "2025-2026".
export function validAcademicYear(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const dash = String.fromCharCode(45);
  if (trimmed.length !== 9 || trimmed.charAt(4) !== dash) return null;
  const head = trimmed.slice(0, 4) + trimmed.slice(5);
  for (const ch of head) {
    const code = ch.charCodeAt(0);
    if (code < 48 || code > 57) return null;
  }
  const start = Number(trimmed.slice(0, 4));
  const end = Number(trimmed.slice(5));
  if (start < 1900 || start > 2099 || end !== start + 1) return null;
  return trimmed;
}

// Short enum-ish labels: letters, numbers, spaces, hyphens, ampersands.
function isLabelChar(code: number): boolean {
  if (code >= 48 && code <= 57) return true;
  if (code >= 65 && code <= 90) return true;
  if (code >= 97 && code <= 122) return true;
  return code === 32 || code === 46 || code === 39 || code === 45 || code === 38 || code === 47 || code === 40 || code === 41;
}

export function validLabel(value: unknown, maxLength = 60): string | null {
  if (typeof value !== "string") return null;
  const trimmed = cleanText(value).trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  for (const ch of trimmed) {
    if (!isLabelChar(ch.charCodeAt(0))) return null;
  }
  if (looksLikeHtmlInjection(trimmed)) return null;
  return trimmed;
}

const MAX_JSON_BYTES = 256 * 1024; // 256 KB per request body

export async function readJson(request: Request): Promise<JsonObject | Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return Response.json({ error: "Request body is too large." }, { status: 413 });
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    return Response.json({ error: "Request body is too large." }, { status: 413 });
  }
  let value: unknown;
  try {
    value = raw.trim() === "" ? null : JSON.parse(raw);
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
  const trimmed = cleanText(value).trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  if (looksLikeHtmlInjection(trimmed)) return null;
  void label;
  return trimmed;
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
  const trimmed = cleanText(value).trim();
  if (trimmed.length > maxLength) return undefined;
  if (trimmed && looksLikeHtmlInjection(trimmed)) return undefined;
  return trimmed || null;
}

export function validDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  for (let pos = 0; pos < 10; pos += 1) {
    const code = value.charCodeAt(pos);
    if (pos === 4 || pos === 7) {
      if (code !== 45) return null;
    } else if (code < 48 || code > 57) return null;
  }
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  // Reject absurd dates (epoch-to-2100 window).
  if (date.getTime() < 0 || date.getTime() > Date.UTC(2100, 0, 1)) return null;
  return date;
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
