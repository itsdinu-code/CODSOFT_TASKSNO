# EduManage

EduManage is a full-stack school administration dashboard built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. It provides one workspace for managing student records, teaching staff, attendance, examinations, fees, academic records, and the school calendar.

## Features

- Dashboard overview with school metrics, revenue, activity, schedules, and calendar events.
- Student directory with create, update, delete, and CSV import workflows.
- Teacher management with class and subject assignments.
- Attendance tracking by student, classroom, date, and status.
- Examination and result management.
- Fee invoices and payments with status tracking.
- Academic records with scores, grades, and remarks.
- PostgreSQL persistence through Prisma ORM.
- Email/password registration and login.
- Scrypt password hashing and signed HTTP-only session cookies.
- Server-side request validation with Zod.
- Shared PostgreSQL connection pooling for concurrent users.
- Responsive dashboard-matched login and registration screens.
- Branded EduManage SVG logo.
- Loading, 404, route-error, and global-error pages.
### How EduManage works

1. A user creates an account or signs in from the authentication page.
2. The server validates the request and checks the PostgreSQL database.
3. A signed HTTP-only session cookie is created after successful authentication.
4. Protected dashboard pages and APIs verify that session before returning data.
5. Dashboard modules load school records from PostgreSQL through Prisma.
6. Forms validate input before creating or updating students, teachers, attendance, exams, fees, and academic records.
7. Loading and error states keep the interface usable when a request is slow or the database is unavailable.

### Skills demonstrated

- **HTML:** semantic page structure, headings, links, metadata, and accessible form controls.
- **CSS:** responsive layouts, spacing, colors, typography, cards, shadows, hover states, and design tokens.
- **TypeScript:** type-safe application code, API contracts, and reusable components.
- **React and Next.js:** App Router pages, server/client components, route handlers, loading states, and error boundaries.
- **Database development:** relational modeling with Prisma and PostgreSQL migrations.
- **Authentication:** password hashing, session cookies, validation, and protected routes.
- **API development:** CRUD endpoints, request validation, authorization, and consistent JSON errors.
- **Performance engineering:** shared connection pooling, bounded database connections, request timeouts, and lightweight loading UI.
- **Accessibility and UX:** semantic labels, keyboard-friendly controls, visible errors, responsive design, and recovery actions.

### What EduManage is used for

- Maintaining a searchable student directory.
- Managing teacher profiles and teaching assignments.
- Recording and reviewing daily attendance.
- Creating examinations and storing student results.
- Tracking invoices, payments, and outstanding fees.
- Reviewing academic performance by student, class, subject, and term.
- Giving school administrators one overview of important operational activity.

### Benefits

- **Less manual work:** replaces disconnected spreadsheets and repeated data entry.
- **Better visibility:** key school metrics and upcoming events appear in one dashboard.
- **Fewer errors:** validation and relational database constraints protect data quality.
- **Faster decisions:** administrators can find attendance, academic, and financial information quickly.
- **Safer access:** authentication and server-side authorization protect school records.
- **Easier growth:** connection pooling and modular APIs support more users and records.
- **Consistent experience:** shared components and design tokens keep every screen visually aligned.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma 7 with `@prisma/adapter-pg`
- React Hook Form and Zod
- Lucide React
- Motion
- Recharts

## Requirements

- Node.js 20.19 or newer
- PostgreSQL 14 or newer
- A PostgreSQL database named `edumanage`

## Getting started

Run all commands from the `edumanage` directory.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `edumanage/.env` and set values for your local PostgreSQL instance:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/edumanage"
AUTH_SECRET="replace-with-a-random-secret-at-least-32-characters"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_CONTACT_EMAIL="support@example.com"
DB_POOL_MAX="20"
DB_POOL_MIN="2"
DB_POOL_MAX_USES="7500"
```

Replace `USERNAME` and `PASSWORD` with real PostgreSQL credentials. URL-encode special characters in the password. Do not commit `.env` or expose `DATABASE_URL` in client-side code.

### 3. Prepare the database

Generate the Prisma client and apply committed migrations:

```bash
npm run db:generate
npm run db:deploy
```

If you are developing a schema change, create a migration with:

```bash
npm run db:migrate -- --name describe-your-change
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database seeding

The repository includes a Prisma seed script that imports the UCI Student Performance CSV data from:

- `prisma/data/student-mat.csv`
- `prisma/data/student-por.csv`

It creates synthetic school data such as students, teachers, classes, subjects, attendance, examinations, academic records, invoices, and payments.

Run the seed with:

```bash
npm run db:generate
npx prisma migrate deploy
npx prisma db seed
```

The seed is designed to be repeatable and does not reset the database. Existing user records and login credentials are preserved.

## Available scripts

```bash
npm run dev          # Start the Next.js development server
npm run build        # Create a production build and run type checking
npm run start        # Start the production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Create a development migration
npm run db:deploy    # Apply committed migrations
npm run db:studio    # Open Prisma Studio
```

## Application routes

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login` | Sign in |
| `/register` | Create an account |
| `/dashboard` | Protected administration dashboard |
| `/dashboard/students` | Student management |
| `/dashboard/teachers` | Teacher management |
| `/dashboard/attendance` | Attendance management |
| `/dashboard/examinations` | Examination management |
| `/dashboard/fees` | Fee management |
| `/dashboard/academic-records` | Academic record management |
| `/dashboard/calendar` | School calendar |

### Authentication API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Successful authentication sets the HTTP-only `edumanage-session` cookie.

### Data API

Protected data endpoints include:

- `/api/dashboard`
- `/api/students`
- `/api/students/import`
- `/api/teachers`
- `/api/attendance`
- `/api/examinations`
- `/api/exam-results`
- `/api/fees`
- `/api/fee-payments`
- `/api/academic-records`
- `/api/subjects`
- `/api/module-options`

Every protected data route verifies the session before accessing PostgreSQL.

## Connection pooling and production load

The shared Prisma client creates one PostgreSQL pool per server process. The pool uses bounded connection counts, a five-second connection timeout, an idle timeout, and connection reuse limits. Configure the pool with:

```env
DB_POOL_MAX="20"
DB_POOL_MIN="2"
DB_POOL_MAX_USES="7500"
```

## Project structure

```text
app/
  api/                       Route handlers for authentication and school data
  components/                Dashboard, forms, layout, and shared UI
  dashboard/                 Protected dashboard route and loading state
  lib/                       Prisma, authentication, validation, and API helpers
  error.tsx                  Route-level error page
  global-error.tsx           Root-level error page
  loading.tsx                Application loading page
  not-found.tsx              404 page
  layout.tsx                 Root metadata, fonts, and providers
prisma/
  data/                      Source CSV data
  migrations/                 Committed database migrations
  schema.prisma               Database schema
  seed.ts                     Repeatable seed script
public/
  edumanage-logo.svg          EduManage application logo
```

## Security

- Keep `.env` local and untracked.
- Use a unique, high-entropy `AUTH_SECRET` in production.
- Use HTTPS and a 

## Validation

Before opening a pull request or deploying:

```bash
npm run lint
npm run build
```

## License and data

Application code is maintained for the EduManage project. The included UCI Student Performance data is used according to its original dataset license and attribution requirements. Review the source dataset terms before redistributing seeded data.
