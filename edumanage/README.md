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

The student directory uses `GET` and `POST /api/students`. If the database is not configured or reachable, the dashboard clearly labels its student data as sample data and prevents student creation. The schema in `prisma/schema.prisma` also models users and roles, teachers, classrooms, subjects, teaching assignments, attendance, examinations and results, fee invoices and payments, and academic records; these other areas are not yet connected to database routes. The shared Prisma client in `app/lib/prisma.ts` is intended for server-side use only.

## Other commands

```bash
npm run lint
npm run build
```
