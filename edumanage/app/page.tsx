import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "./components/site-footer";

export const metadata: Metadata = {
  title: "School administration, minus the chaos",
  description:
    "EduManage brings students, teachers, attendance, fees, and academic records into one calm workspace.",
};

const highlights = [
  { title: "Student records", detail: "Profiles, classes, and status in one searchable directory." },
  { title: "Attendance", detail: "Daily marking with clear history by student and class." },
  { title: "Fees", detail: "Invoices, payments, and due balances without spreadsheets." },
  { title: "Academics", detail: "Exams, results, and progress in one connected view." },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-14">
        <Link href="/" aria-label="EduManage home" className="inline-flex items-center gap-2">
          <Image src="/edumanage-logo.svg" alt="" width={44} height={44} className="size-11 rounded-2xl" priority />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">Edu<span className="text-[#e8622c]">Manage</span></span>
        </Link>
        <div className="mt-4 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              School administration, minus the chaos.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">
              A clear, connected workspace for students, teachers, attendance, fees, and academic
              progress — built for busy school offices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-800 px-7 text-sm font-bold text-white hover:bg-emerald-900"
              >
                Sign in to your dashboard
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">
              <Link className="underline" href="/privacy-policy">Privacy</Link> ·{" "}
              <Link className="underline" href="/terms">Terms</Link>
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_rgba(60,72,140,0.12)] backdrop-blur-xl">
            <p className="text-sm font-bold text-slate-900">A connected school workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Your dashboard metrics are calculated from your PostgreSQL records after you sign in.
              Start with an empty workspace or load the documented fictional seed data.
            </p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              {highlights.slice(0, 4).map((item) => (
                <div key={item.title} className="rounded-2xl bg-emerald-50 p-4">
                  <dt className="text-xs font-semibold text-emerald-900">{item.title}</dt>
                  <dd className="mt-1 text-xs leading-5 text-emerald-950">{item.detail}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-bold text-white"
            >
              Open dashboard
            </Link>
          </div>
        </div>
        <section aria-label="Highlights" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
