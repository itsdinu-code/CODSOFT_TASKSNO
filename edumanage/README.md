# EduManage

EduManage is a student management system built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM. The student directory reads from PostgreSQL and new student records are saved there. Other dashboard areas still use sample data.

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

The student directory uses `GET` and `POST /api/students`; `POST /api/students/import` imports CSV records. A newly migrated database starts with no students, so an empty list means there are no records yet, not that the database is disconnected. Add real records with **Add student** or **Import CSV** in the dashboard.

The CSV importer requires `Name`, `Email`, and `Class` columns. `Status` is optional and accepts `Active`, `On leave`, `Pending`, or `Graduated`. Class values should look like `Grade 10 · Section A`. Other columns, including aggregate `Attendance` percentages, are ignored because they cannot create dated attendance records. Imports are limited to 500 rows and 1 MB, are atomic, and reject duplicate email addresses. Do not import the dashboard's built-in example data as real student records.

If the database is not configured or reachable, the dashboard reports that student records could not be loaded and disables CSV export and student creation. The schema in `prisma/schema.prisma` also models users and roles, teachers, classrooms, subjects, teaching assignments, attendance, examinations and results, fee invoices and payments, and academic records; these other areas are not yet connected to database routes and still use sample data. The shared Prisma client in `app/lib/prisma.ts` is intended for server-side use only.

## Other commands

```bash
npm run lint
npm run build
```
