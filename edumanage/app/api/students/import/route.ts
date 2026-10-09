import { randomUUID } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client";
import { getPrismaClient } from "../../../lib/prisma";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 500;
const ACADEMIC_YEAR = "2025-2026";

type ImportRow = {
  name: string;
  email: string;
  grade: number;
  section: string;
  status: "ACTIVE" | "ON_LEAVE" | "PENDING" | "GRADUATED";
  line: number;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field.trim());
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else if (character === '"') {
      throw new Error(`Unexpected quote on CSV line ${rows.length + 1}.`);
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unterminated quoted field.");
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function toImportRows(csv: string): { rows: ImportRow[]; ignoredColumns: string[] } {
  const parsedRows = parseCsv(csv.replace(/^\uFEFF/, ""));
  const header = parsedRows.shift()?.map((value) => value.trim().toLowerCase());
  if (!header?.length) throw new Error("The CSV file is empty.");

  const duplicateHeaders = header.filter((value, index) => header.indexOf(value) !== index);
  if (duplicateHeaders.length) {
    throw new Error(`Duplicate CSV column: ${duplicateHeaders[0]}.`);
  }

  const requiredColumns = ["name", "email", "class"];
  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length) {
    throw new Error(`CSV must include these columns: ${requiredColumns.join(", ")}.`);
  }

  if (parsedRows.length === 0) throw new Error("The CSV contains no student records.");
  if (parsedRows.length > MAX_ROWS) {
    throw new Error(`Import up to ${MAX_ROWS} students at a time.`);
  }

  const ignoredColumns = header.filter(
    (column) => !["name", "email", "class", "status"].includes(column),
  );
  const emailColumn = header.indexOf("email");
  const nameColumn = header.indexOf("name");
  const classColumn = header.indexOf("class");
  const statusColumn = header.indexOf("status");
  const seenEmails = new Set<string>();

  const rows = parsedRows.map((values, index) => {
    const line = index + 2;
    if (values.length !== header.length) {
      throw new Error(`CSV line ${line} has ${values.length} fields; expected ${header.length}.`);
    }

    const name = values[nameColumn].trim();
    const email = values[emailColumn].trim().toLowerCase();
    const classMatch = /^Grade\s+(\d{1,2})\s*[·-]\s*Section\s+([A-Za-z])$/i.exec(
      values[classColumn].trim(),
    );
    const nameParts = name.split(/\s+/).filter(Boolean);

    if (name.length < 2 || name.length > 100 || nameParts.length < 2) {
      throw new Error(`CSV line ${line}: enter the student's first and last name.`);
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`CSV line ${line}: enter a valid email address.`);
    }
    if (seenEmails.has(email)) {
      throw new Error(`CSV line ${line}: duplicate email address ${email}.`);
    }
    seenEmails.add(email);
    if (!classMatch) {
      throw new Error(`CSV line ${line}: class must look like "Grade 10 · Section A".`);
    }

    const statusValue = statusColumn < 0 ? "active" : values[statusColumn].trim().toLowerCase();
    const statuses: Record<string, ImportRow["status"]> = {
      active: "ACTIVE",
      "on leave": "ON_LEAVE",
      pending: "PENDING",
      graduated: "GRADUATED",
    };
    const status = statuses[statusValue];
    if (!status) {
      throw new Error(
        `CSV line ${line}: unsupported status "${statusValue}". Use Active, On leave, Pending, or Graduated.`,
      );
    }

    return {
      name,
      email,
      grade: Number(classMatch[1]),
      section: classMatch[2].toUpperCase(),
      status,
      line,
    };
  });

  return { rows, ignoredColumns };
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "DATABASE_URL is not configured. Add your PostgreSQL connection string to edumanage/.env." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES) {
    return Response.json({ error: "Choose a CSV file smaller than 1 MB." }, { status: 413 });
  }

  let csv: string;
  try {
    csv = await request.text();
  } catch {
    return Response.json({ error: "Could not read the CSV request body." }, { status: 400 });
  }
  if (new TextEncoder().encode(csv).byteLength > MAX_FILE_BYTES) {
    return Response.json({ error: "Choose a CSV file smaller than 1 MB." }, { status: 413 });
  }

  let rows: ImportRow[];
  let ignoredColumns: string[];
  try {
    const parsed = toImportRows(csv);
    rows = parsed.rows;
    ignoredColumns = parsed.ignoredColumns;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not read the CSV file." },
      { status: 400 },
    );
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (transaction) => {
      for (const row of rows) {
        const classroom = await transaction.classroom.upsert({
          where: {
            grade_section_academicYear: {
              grade: row.grade,
              section: row.section,
              academicYear: ACADEMIC_YEAR,
            },
          },
          update: {},
          create: {
            grade: row.grade,
            section: row.section,
            academicYear: ACADEMIC_YEAR,
          },
        });

        const nameParts = row.name.split(/\s+/).filter(Boolean);
        const [firstName, ...lastNameParts] = nameParts;
        await transaction.student.create({
          data: {
            admissionNumber: `ADM-${randomUUID()}`,
            firstName,
            lastName: lastNameParts.join(" "),
            email: row.email,
            classroomId: classroom.id,
            status: row.status,
          },
        });
      }
    });

    return Response.json(
      { imported: rows.length, ignoredColumns, source: "database" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { error: "An email address in this CSV already exists in the database. No records were imported." },
        { status: 409 },
      );
    }

    console.error("Failed to import students into PostgreSQL.", error);
    return Response.json(
      { error: "The student import could not be saved. Check the database connection and try again." },
      { status: 503 },
    );
  }
}
