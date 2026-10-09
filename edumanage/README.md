# EduManage

EduManage is a student management system built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM. The student directory and the Attendance, Examinations, Fees, and Academic records modules read and write PostgreSQL records.

## Requirements

- Node.js 20.19 or newer
- PostgreSQL

## Set up PostgreSQL

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `edumanage`.

3. Copy `.env.example` to `.env` and replace `USER` and `PASSWORD` in `DATABASE_URL` with your PostgreSQL credentials. URL-encode special characters in the password. Keep `.env` local and untracked.

4. Generate the Prisma client and apply the checked-in initial migration:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Use `npm run db:studio` to open Prisma Studio. For future schema changes during development, use `npm run db:migrate -- --name <migration-name>` and commit the generated migration.

## Seed the UCI student performance data

The seed imports the CC BY 4.0 UCI Student Performance data from `prisma/data/student-por.csv` and `prisma/data/student-mat.csv`. It creates 649 Portuguese dataset students, generated names/contact details and staff, term exams/results, attendance across weekdays in the 2025-2026 school year, academic records, and tuition invoices/payments. Faker-generated records are synthetic and use `UCI-` identifiers.

Install dependencies and generate the Prisma client, apply additive migrations, then seed without resetting the database:

```bash
npm install
npm run db:generate
npx prisma migrate deploy
npx prisma db seed
```

The seed is repeatable and preserves unrelated records. It never resets or deletes database data. The UCI Math and Portuguese files do not contain a shared student ID; Math results are associated only when all shared non-grade/non-absence profile fields match, with duplicate profiles paired in file order. Existing `User` rows and login credentials are not modified.

The student directory uses `GET` and `POST /api/students`; `POST /api/students/import` imports CSV records. Attendance, exams and exam results, fee invoices and payments, and academic records each have server-side CRUD API routes under `/api/attendance`, `/api/examinations`, `/api/fees`, and `/api/academic-records`. Reference choices are loaded from `/api/module-options`; new subjects can be created from the Examinations or Academic records screens.

A newly migrated database starts with no students, classes, subjects, or module records, so an empty list means there are no records yet, not that the database is disconnected. Add real students with **Add student** or **Import CSV** in the dashboard. Student creation assigns a class, which makes it available to attendance, fee, exam, and academic-record forms. Add subjects from the Examinations or Academic records screens before creating records that need them. All module data is loaded from PostgreSQL; no sample records are inserted.

The CSV importer requires `Name`, `Email`, and `Class` columns. `Status` is optional and accepts `Active`, `On leave`, `Pending`, or `Graduated`. Class values should look like `Grade 10 · Section A`. Other columns, including aggregate `Attendance` percentages, are ignored because they cannot create dated attendance records. Imports are limited to 500 rows and 1 MB, are atomic, and reject duplicate email addresses. Do not import the dashboard's built-in example data as real student records.

If the database is not configured or reachable, the dashboard reports that records could not be loaded and shows retryable errors. The schema in `prisma/schema.prisma` models users and roles, teachers, classrooms, subjects, teaching assignments, attendance, examinations and results, fee invoices and payments, and academic records. The existing initial migration already creates these models and relationships. The shared Prisma client in `app/lib/prisma.ts` is intended for server-side use only; do not expose `DATABASE_URL` or credentials to client code.

## Other commands

```bash
npm run lint
npm run build
```
