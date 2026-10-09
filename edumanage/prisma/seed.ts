// Data source: UCI Student Performance dataset (Cortez & Silva, 2008), CC BY 4.0

import { PrismaPg } from "@prisma/adapter-pg";
import { en, Faker, pt_PT } from "@faker-js/faker";
import { parse } from "csv-parse/sync";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "../generated/prisma/client";

type CsvStudent = Record<string, string> & {
  sex: string;
  age: string;
  address: string;
  absences: string;
  G1: string;
  G2: string;
  G3: string;
};

const DATA_DIR = new URL("./data/", import.meta.url);
const ACADEMIC_YEAR = "2025-2026";
const SECTIONS = ["A", "B", "C", "D", "E"];
const SUBJECTS = [
  { code: "PORTUGUESE", name: "Portuguese" },
  { code: "MATHEMATICS", name: "Mathematics" },
] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "ONLINE"] as const;
const TERMS = [
  { key: "T1", title: "Term 1", grade: "G1", date: new Date("2025-11-15T09:00:00.000Z"), term: "Term 1" },
  { key: "T2", title: "Term 2", grade: "G2", date: new Date("2026-03-15T09:00:00.000Z"), term: "Term 2" },
  { key: "FINAL", title: "Final", grade: "G3", date: new Date("2026-06-15T09:00:00.000Z"), term: "Final" },
] as const;
const faker = new Faker({ locale: [pt_PT, en] });

function validateRows(rows: CsvStudent[], file: string): void {
  if (!rows.length) throw new Error(`${file} has no data rows.`);
  for (const [index, row] of rows.entries()) {
    const age = Number(row.age);
    const absences = Number(row.absences);
    if (!["F", "M"].includes(row.sex) || !["U", "R"].includes(row.address)) {
      throw new Error(`${file} row ${index + 2} has invalid sex or address data.`);
    }
    if (!Number.isInteger(age) || age < 15 || age > 22 || !Number.isInteger(absences) || absences < 0) {
      throw new Error(`${file} row ${index + 2} has invalid age or absence data.`);
    }
    for (const field of ["G1", "G2", "G3"] as const) {
      const grade = Number(row[field]);
      if (!Number.isFinite(grade) || grade < 0 || grade > 20) {
        throw new Error(`${file} row ${index + 2} has an invalid ${field} grade.`);
      }
    }
  }
}

function parseCsv(contents: string, file: string): CsvStudent[] {
  const rows = parse(contents, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvStudent[];
  validateRows(rows, file);
  return rows;
}

function studentGrade(age: number): number {
  if (age === 15) return 10;
  if (age === 16) return 11;
  return 12;
}

function profileKey(row: CsvStudent, profileFields: string[]): string {
  return profileFields.map((field) => row[field]).join("\u001f");
}

function schoolDays(): Date[] {
  const dates: Date[] = [];
  const date = new Date(Date.UTC(2025, 8, 1));
  const end = new Date(Date.UTC(2026, 5, 30));
  while (date <= end) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function examId(subjectCode: string, grade: number, section: string, termKey: string): string {
  return `uci-${subjectCode.toLowerCase()}-${grade}-${section}-${termKey.toLowerCase()}`;
}

function seededEmail(firstName: string, lastName: string, index: number, provider: string): string {
  const generated = faker.internet.email({ firstName, lastName, provider }).toLowerCase();
  const [localPart, domain] = generated.split("@");
  return `${localPart}.${String(index + 1).padStart(4, "0")}@${domain}`;
}

async function main(): Promise<void> {
  const [portugueseText, mathText] = await Promise.all([
    readFile(new URL("student-por.csv", DATA_DIR), "utf8"),
    readFile(new URL("student-mat.csv", DATA_DIR), "utf8"),
  ]);
  const portugueseRows = parseCsv(portugueseText, "student-por.csv");
  const mathRows = parseCsv(mathText, "student-mat.csv");
  if (portugueseRows.length !== 649) {
    throw new Error(`Expected 649 Portuguese rows, found ${portugueseRows.length}.`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be configured before running the seed.");

  faker.seed(2008);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const classroomIds = new Map<string, string>();
    for (const grade of [10, 11, 12]) {
      for (const section of SECTIONS) {
        const classroom = await prisma.classroom.upsert({
          where: { grade_section_academicYear: { grade, section, academicYear: ACADEMIC_YEAR } },
          update: {},
          create: { grade, section, academicYear: ACADEMIC_YEAR },
          select: { id: true },
        });
        classroomIds.set(`${grade}-${section}`, classroom.id);
      }
    }

    const subjectIds = new Map<string, string>();
    for (const subject of SUBJECTS) {
      const record = await prisma.subject.upsert({
        where: { code: subject.code },
        update: {},
        create: { ...subject, description: `Seeded from the UCI student performance dataset.` },
        select: { id: true },
      });
      subjectIds.set(subject.code, record.id);
    }

    const teachers: { id: string; classroomId: string; subjectId: string }[] = [];
    let teacherIndex = 0;
    for (const classroomId of classroomIds.values()) {
      for (const subject of SUBJECTS) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const teacher = await prisma.teacher.upsert({
          where: { employeeNumber: `UCI-TEACHER-${String(teacherIndex + 1).padStart(3, "0")}` },
          update: {},
          create: {
            employeeNumber: `UCI-TEACHER-${String(teacherIndex + 1).padStart(3, "0")}`,
            firstName,
            lastName,
            email: seededEmail(firstName, lastName, teacherIndex, "teachers.edumanage.example"),
            phone: faker.phone.number(),
            designation: subject.name,
          },
          select: { id: true },
        });
        teachers.push({ id: teacher.id, classroomId, subjectId: subjectIds.get(subject.code)! });
        teacherIndex += 1;
      }
    }

    await prisma.teachingAssignment.createMany({
      data: teachers.map((teacher) => ({
        teacherId: teacher.id,
        classroomId: teacher.classroomId,
        subjectId: teacher.subjectId,
      })),
      skipDuplicates: true,
    });

    const sectionByRow = portugueseRows.map((row, index) => {
      const grade = studentGrade(Number(row.age));
      return { grade, section: SECTIONS[(index + grade) % SECTIONS.length] };
    });
    const studentData = portugueseRows.map((row, index) => {
      const { grade, section } = sectionByRow[index];
      const firstName = faker.person.firstName(row.sex === "F" ? "female" : "male");
      const lastName = faker.person.lastName();
      const birthYear = 2025 - Number(row.age);
      return {
        admissionNumber: `UCI-POR-${String(index + 1).padStart(4, "0")}`,
        firstName,
        lastName,
        email: seededEmail(firstName, lastName, index, "students.edumanage.example"),
        phone: faker.phone.number(),
        sex: row.sex,
        age: Number(row.age),
        address: row.address,
        dateOfBirth: new Date(Date.UTC(birthYear, 0, 15)),
        enrollmentDate: new Date(Date.UTC(2025, 8, 1)),
        status: "ACTIVE" as const,
        classroomId: classroomIds.get(`${grade}-${section}`)!,
      };
    });
    await prisma.student.createMany({ data: studentData, skipDuplicates: true });

    const students = await prisma.student.findMany({
      where: { admissionNumber: { in: studentData.map((student) => student.admissionNumber) } },
      select: { id: true, admissionNumber: true, classroomId: true },
    });
    const studentByAdmission = new Map(students.map((student) => [student.admissionNumber, student]));

    const mathProfileFields = Object.keys(portugueseRows[0]).filter(
      (field) => !["absences", "G1", "G2", "G3"].includes(field),
    );
    const mathByProfile = new Map<string, CsvStudent[]>();
    for (const row of mathRows) {
      const key = profileKey(row, mathProfileFields);
      const matchingRows = mathByProfile.get(key) ?? [];
      matchingRows.push(row);
      mathByProfile.set(key, matchingRows);
    }

    const classSubjectTeacher = new Map(
      teachers.map((teacher) => [`${teacher.classroomId}-${teacher.subjectId}`, teacher.id]),
    );
    const exams: { id: string; subjectCode: string; grade: number; section: string; termKey: string; title: string }[] = [];
    for (const [classKey, classroomId] of classroomIds) {
      const [gradeText, section] = classKey.split("-");
      const grade = Number(gradeText);
      for (const subject of SUBJECTS) {
        const subjectId = subjectIds.get(subject.code)!;
        for (const term of TERMS) {
          const id = examId(subject.code, grade, section, term.key);
          const teacherId = classSubjectTeacher.get(`${classroomId}-${subjectId}`);
          if (!teacherId) throw new Error(`Missing teacher assignment for ${classKey} / ${subject.code}.`);
          const exam = await prisma.exam.upsert({
            where: { id },
            update: {},
            create: {
              id,
              title: term.title,
              description: `UCI dataset ${term.grade} marks · seeded data`,
              type: term.key === "FINAL" ? "FINAL" : "MIDTERM",
              subjectId,
              classroomId,
              createdById: teacherId,
              startsAt: term.date,
              maxScore: 100,
            },
          });
          exams.push({ id: exam.id, subjectCode: subject.code, grade, section, termKey: term.key, title: term.title });
        }
      }
    }

    const examResults: { examId: string; studentId: string; score: number }[] = [];
    const academicRecords: {
      studentId: string;
      classroomId: string;
      subjectId: string;
      academicYear: string;
      term: string;
      score: number;
      maxScore: number;
    }[] = [];
    let matchedMathStudents = 0;

    for (const [rowIndex, row] of portugueseRows.entries()) {
      const student = studentByAdmission.get(`UCI-POR-${String(rowIndex + 1).padStart(4, "0")}`);
      if (!student?.classroomId) throw new Error(`Could not find seeded student row ${rowIndex + 1}.`);
      const classroom = sectionByRow[rowIndex];
      const mathMatches = mathByProfile.get(profileKey(row, mathProfileFields));
      const mathRow = mathMatches?.shift();
      if (mathRow) matchedMathStudents += 1;

      for (const subject of SUBJECTS) {
        const sourceRow = subject.code === "PORTUGUESE" ? row : mathRow;
        if (!sourceRow) continue;
        const subjectId = subjectIds.get(subject.code)!;
        for (const term of TERMS) {
          const score = Number(sourceRow[term.grade]) * 5;
          const exam = exams.find(
            (item) =>
              item.subjectCode === subject.code &&
              item.grade === classroom.grade &&
              item.section === classroom.section &&
              item.termKey === term.key,
          );
          if (!exam) throw new Error(`Could not find ${term.title} exam for ${subject.code}.`);
          examResults.push({ examId: exam.id, studentId: student.id, score });
          academicRecords.push({
            studentId: student.id,
            classroomId: student.classroomId,
            subjectId,
            academicYear: ACADEMIC_YEAR,
            term: term.term,
            score,
            maxScore: 100,
          });
        }
      }
    }
    await prisma.examResult.createMany({ data: examResults, skipDuplicates: true });
    await prisma.academicRecord.createMany({ data: academicRecords, skipDuplicates: true });

    const attendanceDates = schoolDays();
    const attendanceRows: {
      studentId: string;
      classroomId: string;
      markedById: string;
      date: Date;
      status: "PRESENT" | "ABSENT";
      note: string;
    }[] = [];
    for (const [rowIndex, row] of portugueseRows.entries()) {
      const student = studentByAdmission.get(`UCI-POR-${String(rowIndex + 1).padStart(4, "0")}`);
      if (!student?.classroomId) throw new Error(`Could not find seeded student row ${rowIndex + 1}.`);
      const teacher = teachers.find((item) => item.classroomId === student.classroomId);
      if (!teacher) throw new Error(`Could not find attendance marker for student row ${rowIndex + 1}.`);
      const absences = Number(row.absences);
      const absentDays = new Set(
        Array.from({ length: absences }, (_, index) =>
          Math.floor(((index + 0.5) * attendanceDates.length) / Math.max(absences, 1)),
        ),
      );
      attendanceDates.forEach((date, dateIndex) => {
        attendanceRows.push({
          studentId: student.id,
          classroomId: student.classroomId!,
          markedById: teacher.id,
          date,
          status: absentDays.has(dateIndex) ? "ABSENT" : "PRESENT",
          note: "UCI student performance dataset seed",
        });
      });
    }
    for (const batch of chunks(attendanceRows, 5000)) {
      await prisma.attendance.createMany({ data: batch, skipDuplicates: true });
    }

    const invoiceData = studentData.flatMap((student, studentIndex) =>
      TERMS.map((term, termIndex) => {
        const randomValue = faker.number.int({ min: 1, max: 100 });
        const status: "PAID" | "PARTIALLY_PAID" | "PENDING" =
          randomValue <= 55 ? "PAID" : randomValue <= 80 ? "PARTIALLY_PAID" : "PENDING";
        const amount = faker.number.int({ min: 15000, max: 40000 });
        const paidAmount =
          status === "PAID"
            ? amount
            : status === "PARTIALLY_PAID"
              ? faker.number.int({ min: Math.ceil(amount * 0.2), max: Math.floor(amount * 0.8) })
              : 0;
        return {
          invoiceNumber: `UCI-${String(studentIndex + 1).padStart(4, "0")}-${term.key}`,
          studentAdmission: student.admissionNumber,
          studentIndex,
          termIndex,
          term,
          amount,
          status,
          paidAmount,
          createdAt: new Date(
            Date.UTC(2026, (studentIndex + termIndex * 3) % 10, 1 + ((studentIndex + termIndex) % 20)),
          ),
        };
      }),
    );
    const seededStudents = new Map(students.map((student) => [student.admissionNumber, student]));
    await prisma.feeInvoice.createMany({
      data: invoiceData.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        studentId: seededStudents.get(invoice.studentAdmission)!.id,
        academicYear: ACADEMIC_YEAR,
        term: invoice.term.term,
        description: `Tuition fee · ${invoice.term.title} · seeded data`,
        amount: invoice.amount,
        dueDate: invoice.term.date,
        status: invoice.status,
        createdAt: invoice.createdAt,
        updatedAt: invoice.createdAt,
      })),
      skipDuplicates: true,
    });

    const paymentRows = invoiceData
      .filter((invoice) => invoice.paidAmount > 0)
      .map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.paidAmount,
        studentIndex: invoice.studentIndex,
        termIndex: invoice.termIndex,
      }));
    const invoices = await prisma.feeInvoice.findMany({
      where: { invoiceNumber: { in: invoiceData.map((invoice) => invoice.invoiceNumber) } },
      select: { id: true, invoiceNumber: true },
    });
    const invoiceIds = new Map(invoices.map((invoice) => [invoice.invoiceNumber, invoice.id]));
    await prisma.feePayment.createMany({
      data: paymentRows.map((payment) => ({
        invoiceId: invoiceIds.get(payment.invoiceNumber)!,
        amount: payment.amount,
        method: PAYMENT_METHODS[(payment.studentIndex + payment.termIndex) % PAYMENT_METHODS.length],
        transactionId: `UCI-PAY-${payment.invoiceNumber}`,
        note: "Seeded tuition payment",
        paidAt: new Date(Date.UTC(2026, payment.studentIndex % 10, 15)),
      })),
      skipDuplicates: true,
    });

    console.info(
      `UCI seed complete: ${students.length} students, ${teachers.length} teachers, ` +
        `${exams.length} exams, ${examResults.length} exam results, ${academicRecords.length} academic records, ` +
        `${attendanceRows.length} weekday attendance records, ${invoiceData.length} invoices, ` +
        `${paymentRows.length} payments. Matched Math profiles for ${matchedMathStudents} students.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("EduManage seed failed.", error);
  process.exitCode = 1;
});
