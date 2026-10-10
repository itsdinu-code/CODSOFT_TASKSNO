"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Home,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { SchoolModule } from "./school-module";
import { ConfirmDialog, RecordControls } from "./record-controls";

type Section = "overview" | "students" | "teachers" | "attendance" | "examinations" | "fees" | "academic-records" | "calendar";
type OverviewResponse = {
  generatedAt: string;
  calendarMonth: string;
  metrics: { students: number; teachers: number; attendance: number | null; dueFees: number };
  revenue: { month: string; invoiced: number; collected: number }[];
  teachers: Teacher[];
  events: DashboardEvent[];
  calendarDots: Record<string, number>;
};
type Teacher = {
  id: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation: string | null;
  status?: string;
  assignments: { subject: { name: string } }[];
};
type DashboardEvent = {
  id: string;
  kind: "exam" | "fee";
  date: string;
  title: string;
  detail: string;
};
type Student = {
  id: string;
  name: string;
  email: string;
  className: string;
  status: string;
  avatarColor: string;
  initials: string;
};

const navItems: { label: string; href: string; section: Section; icon: typeof Home }[] = [
  { label: "Home", href: "/dashboard", section: "overview", icon: Home },
  { label: "Students", href: "/dashboard/students", section: "students", icon: Users },
  { label: "Teachers", href: "/dashboard/teachers", section: "teachers", icon: GraduationCap },
  { label: "Attendance", href: "/dashboard/attendance", section: "attendance", icon: Activity },
  { label: "Exams / Fees", href: "/dashboard/examinations", section: "examinations", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", section: "calendar", icon: CalendarDays },
];

const sectionTitles: Record<Section, string> = {
  overview: "Admin overview",
  students: "Students",
  teachers: "Teachers",
  attendance: "Attendance",
  examinations: "Examinations",
  fees: "Fees",
  "academic-records": "Academic records",
  calendar: "School calendar",
};

const pastelCards = [
  { label: "Total Students", key: "students", icon: Users, className: "bg-white", iconClassName: "bg-[#eee9ff] text-[#704fd6]", decor: "text-[#704fd6]" },
  { label: "Total Teachers", key: "teachers", icon: GraduationCap, className: "bg-white", iconClassName: "bg-[#e4f2ff] text-[#397fb5]", decor: "text-[#397fb5]" },
  { label: "Avg Attendance", key: "attendance", icon: Activity, className: "bg-white", iconClassName: "bg-[#e5f3e9] text-[#448a5b]", decor: "text-[#448a5b]" },
  { label: "Due Fees", key: "dueFees", icon: Wallet, className: "bg-white", iconClassName: "bg-[#fff0e4] text-[#e8622c]", decor: "text-[#e8622c]" },
] as const;

const fallbackOverview: OverviewResponse = {
  generatedAt: "",
  calendarMonth: "",
  metrics: { students: 0, teachers: 0, attendance: null, dueFees: 0 },
  revenue: [],
  teachers: [],
  events: [],
  calendarDots: {},
};

function sectionFromPath(pathname: string): Section {
  const lastPart = pathname.split("/").filter(Boolean).at(-1) ?? "dashboard";
  if (lastPart === "dashboard") return "overview";
  if (lastPart === "academic-records" || lastPart === "academic_records") return "academic-records";
  return ["students", "teachers", "attendance", "examinations", "fees", "calendar"].includes(lastPart)
    ? lastPart as Section
    : "overview";
}

function formatMoney(value: number, compact = false) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", options).format(date);
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  const body = typeof result === "object" && result !== null ? result as Record<string, unknown> : {};
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Request failed (${response.status}).`);
  return body as T;
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`dashboard-card min-w-0 rounded-3xl border border-white/90 bg-white/90 p-5 shadow-[0_10px_30px_rgba(36,48,60,0.055)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(36,48,60,0.09)] sm:p-6 ${className}`}>{children}</section>;
}

function PanelHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[#0a0a0a]">{title}</h2>
        {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function LoadingPanel({ title }: { title: string }) {
  return (
    <Panel>
      <PanelHeading title={title} />
      <div role="status" aria-label={`Loading ${title.toLowerCase()}`} className="space-y-3">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
      </div>
    </Panel>
  );
}

function MetricCard({
  item,
  value,
  target,
  detail,
  index,
}: {
  item: (typeof pastelCards)[number];
  value: string;
  target: number | null;
  detail: string;
  index: number;
}) {
  const Icon = item.icon;
  const Decor = item.icon;
  const prefersReducedMotion = useReducedMotion();
  const count = useMotionValue(prefersReducedMotion || target === null ? target ?? 0 : 0);
  const displayValue = useTransform(count, (current) => {
    if (target === null) return value;
    if (item.key === "attendance") return `${current.toFixed(1)}%`;
    if (item.key === "dueFees") return formatMoney(current, true);
    return Math.round(current).toLocaleString("en-IN");
  });

  useEffect(() => {
    if (target === null) return;
    if (prefersReducedMotion) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration: 0.32, ease: "easeOut" });
    return () => controls.stop();
  }, [count, prefersReducedMotion, target]);

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.24, delay: prefersReducedMotion ? 0 : index * 0.035, ease: "easeOut" }}
      className={`dashboard-card relative isolate flex min-h-[170px] flex-col overflow-hidden rounded-3xl border border-white/90 p-5 shadow-[0_10px_30px_rgba(36,48,60,0.055)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(36,48,60,0.09)] ${item.className}`}
    >
      <span className={`flex size-10 items-center justify-center rounded-2xl shadow-sm ${item.iconClassName}`}>
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-medium text-slate-600">{item.label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0a0a0a]"><motion.span>{displayValue}</motion.span></p>
      <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3 py-1.5 text-[10px] font-medium text-white">
        {detail !== "Live database total" && detail !== "No attendance marked"
          ? <ArrowUpRight size={12} className="text-emerald-300" aria-hidden="true" />
          : <Activity size={12} className="text-orange-300" aria-hidden="true" />}
        {detail}
      </span>
      <Decor className={`pointer-events-none absolute -bottom-3 -right-3 -z-10 size-24 opacity-[0.08]`} aria-hidden="true" />
    </motion.article>
  );
}

function RevenuePanel({ data, loading, error }: { data: OverviewResponse; loading: boolean; error: string }) {
  const prefersReducedMotion = useReducedMotion();
  const total = data.revenue.reduce((sum, month) => sum + month.invoiced, 0);
  const collected = data.revenue.reduce((sum, month) => sum + month.collected, 0);
  if (loading) return <LoadingPanel title="Revenue Statistic" />;
  if (error) return <Panel><PanelHeading title="Revenue Statistic" /><ErrorText error={error} /></Panel>;
  return (
    <Panel className="min-h-[330px]">
      <PanelHeading
        title="Revenue Statistic"
        detail={`Invoice and payment totals · ${data.generatedAt ? new Date(data.generatedAt).getFullYear() : "—"}`}
        action={
          <div className="shrink-0 rounded-2xl bg-[#0a0a0a] px-3 py-2 text-white">
            <p className="text-[9px] text-white/60">Total Fee · Collected</p>
            <p className="mt-0.5 text-xs font-semibold">{formatMoney(total, true)} · {formatMoney(collected, true)}</p>
          </div>
        }
      />
      {data.revenue.length === 0 ? (
        <EmptyState message="No invoice or payment activity recorded for this year." />
      ) : (
        <div className="h-[230px] w-full" aria-label="Monthly fee and payment totals">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenue} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8622c" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#e8622c" stopOpacity={0.015} />
                </linearGradient>
                <linearGradient id="collected-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5b16f" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="#f5b16f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#d9dde4" strokeDasharray="4 6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b909b", fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [formatMoney(Number(value)), name === "invoiced" ? "Total fee" : "Collected"]}
                contentStyle={{ borderRadius: 14, border: "1px solid #eef0f3", fontSize: 12 }}
              />
              <Area dataKey="invoiced" type="monotone" stroke="#e8622c" strokeWidth={3} fill="url(#revenue-area-gradient)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} animationDuration={280} />
              <Area dataKey="collected" type="monotone" stroke="#f5b16f" strokeWidth={2} fill="url(#collected-area-gradient)" dot={false} activeDot={{ r: 3 }} isAnimationActive={!prefersReducedMotion} animationDuration={280} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#e8622c]" />Invoiced</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#f5b16f]" />Collected</span>
      </div>
    </Panel>
  );
}

function ErrorText({ error }: { error: string }) {
  return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs leading-5 text-slate-500">{message}</p>;
}

function TeacherPanel({ teachers, loading, error }: { teachers: Teacher[]; loading: boolean; error: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (loading) return <LoadingPanel title="Top Teachers" />;
  return (
    <Panel className="h-full">
      <PanelHeading title="Top Teachers" detail="Active staff from your directory" action={<button type="button" aria-label="Teacher list options" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18} /></button>} />
      {error ? <ErrorText error={error} /> : teachers.length ? (
        <div className="space-y-3">
          {teachers.slice(0, 6).map((teacher, index) => (
            <motion.div
              key={teacher.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: prefersReducedMotion ? 0 : index * 0.02, ease: "easeOut" }}
              className="flex min-w-0 items-center gap-3"
            >
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700", "bg-rose-100 text-rose-700", "bg-indigo-100 text-indigo-700"][index]}`}>
                {initials(teacher.firstName, teacher.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#171717]">{teacher.firstName} {teacher.lastName}</p>
                <p className="truncate text-[10px] text-slate-500">{teacher.email}</p>
              </div>
              <span className="max-w-24 truncate rounded-full bg-slate-100 px-2.5 py-1 text-[9px] text-slate-600">
                {teacher.assignments[0]?.subject.name ?? teacher.designation ?? "Unassigned"}
              </span>
            </motion.div>
          ))}
        </div>
      ) : <EmptyState message="No active teachers found in the database." />}
    </Panel>
  );
}

function eventTime(event: DashboardEvent) {
  return formatDate(event.date, { weekday: "short", day: "numeric", month: "short" });
}

function UpcomingEventsPanel({ events, loading, error }: { events: DashboardEvent[]; loading: boolean; error: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (loading) return <LoadingPanel title="Upcoming Events" />;
  const colors = ["bg-orange-500", "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500"];
  return (
    <Panel className="h-full">
      <PanelHeading title="Upcoming Events" detail="Exams and outstanding fee due dates" />
      {error ? <ErrorText error={error} /> : events.length ? (
        <div className="space-y-3">
          {events.slice(0, 5).map((event, index) => (
            <motion.div
              key={event.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: prefersReducedMotion ? 0 : index * 0.02, ease: "easeOut" }}
              className="flex min-w-0 items-center gap-3"
            >
              <span className={`h-10 w-1 shrink-0 rounded-full ${colors[index % colors.length]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-slate-500">{eventTime(event)} · {event.kind === "exam" ? "Exam" : "Fee due"}</p>
                <p className="truncate text-xs font-semibold text-[#171717]">{event.title}</p>
                <p className="truncate text-[10px] text-slate-500">{event.detail}</p>
              </div>
              <Link href={event.kind === "exam" ? "/dashboard/examinations" : "/dashboard/fees"} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600 hover:border-[#e8622c] hover:text-[#e8622c]">View</Link>
            </motion.div>
          ))}
        </div>
      ) : <EmptyState message="There are no upcoming exams or fee due dates on record." />}
    </Panel>
  );
}

function CalendarPanel({
  month,
  onMonthChange,
  dots,
  today,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  dots: Record<string, number>;
  today: Date;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const count = Math.ceil((firstDay + totalDays) / 7) * 7;
  const dates = Array.from({ length: count }, (_, index) => index - firstDay + 1);
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);

  return (
    <Panel>
      <PanelHeading
        title={title}
        action={
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={16} /></button>
            <button type="button" aria-label="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><ChevronRight size={16} /></button>
          </div>
        }
      />
      <div className="grid grid-cols-7 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="pb-2 text-[10px] font-medium text-slate-400">{day}</span>)}
        {dates.map((day, index) => {
          const inMonth = day > 0 && day <= totalDays;
          const key = inMonth
            ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          const isToday = inMonth && day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
          const selected = inMonth && selectedDate === key;
          return (
            <span key={`${key || "blank"}-${index}`} className="relative mx-auto flex size-8 items-center justify-center">
              {inMonth && <button type="button" aria-label={`${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long" }).format(new Date(month.getFullYear(), month.getMonth(), day))} ${day}${dots[key] ? `, ${dots[key]} events` : ""}`} aria-pressed={selected} onClick={() => setSelectedDate(key)} className={`flex size-7 items-center justify-center rounded-full text-[11px] transition hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8622c] ${isToday ? "bg-[#e8622c] font-semibold text-white hover:bg-[#d95625]" : selected ? "bg-slate-900 font-semibold text-white hover:bg-slate-800" : "text-slate-700"}`}>{day}</button>}
              {inMonth && dots[key] && <i aria-label={`${dots[key]} events`} className={`absolute bottom-0.5 size-1 rounded-full ${isToday ? "bg-[#e8622c]" : "bg-violet-500"}`} />}
            </span>
          );
        })}
      </div>
      {selectedDate?.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`) && (
        <p aria-live="polite" className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
          {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${selectedDate}T12:00:00`))}
          {dots[selectedDate] ? ` · ${dots[selectedDate]} scheduled ${dots[selectedDate] === 1 ? "event" : "events"}` : " · No events scheduled"}
        </p>
      )}
    </Panel>
  );
}

function ComingUp({ events, now }: { events: DashboardEvent[]; now: Date }) {
  const today = now;
  const upcoming = events.slice(0, 2);
  return (
    <Panel>
      <PanelHeading title="Akan Datang" detail="Your next scheduled items" />
      {upcoming.length ? <div className="space-y-3">
        {upcoming.map((event) => {
          const days = Math.max(0, Math.ceil((new Date(event.date).getTime() - today.getTime()) / 86400000));
          const Icon = event.kind === "exam" ? BookOpen : CircleDollarSign;
          return (
            <Link key={event.id} href={event.kind === "exam" ? "/dashboard/examinations" : "/dashboard/fees"} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-slate-50">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${event.kind === "exam" ? "bg-violet-100 text-violet-700" : "bg-orange-100 text-orange-700"}`}><Icon size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-800">{event.title}</span>
                <span className="block truncate text-[10px] text-slate-500">{event.detail}</span>
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">{days === 0 ? "Today" : `in ${days}d`}</span>
              <ChevronRight size={14} className="shrink-0 text-slate-400" />
            </Link>
          );
        })}
      </div> : <EmptyState message="Upcoming items will appear when exams or fee due dates are recorded." />}
    </Panel>
  );
}

function AnnouncementsPanel() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_right,rgba(232,98,44,0.3),transparent_46%),#111827] p-5 text-white shadow-[0_16px_36px_rgba(17,24,39,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(17,24,39,0.22)] sm:p-6">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-white/10 text-orange-300"><Bell size={17} /></span>
      <Link href="/dashboard/calendar" aria-label="View upcoming school events" className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full bg-white text-[#0a0a0a] transition hover:scale-105"><ArrowRight size={16} /></Link>
      <h2 className="mt-5 text-base font-semibold">Promo Terbaik</h2>
      <p className="mt-1 max-w-xs text-xs leading-5 text-white/65">Make important school dates easy to find in your calendar.</p>
    </section>
  );
}

function MetricSkeleton() {
  return <div aria-hidden="true" className="min-h-[170px] animate-pulse rounded-3xl bg-slate-200/70 p-5"><span className="block size-10 rounded-2xl bg-white/70" /><span className="mt-5 block h-3 w-24 rounded-full bg-white/70" /><span className="mt-2 block h-8 w-32 rounded-full bg-white/70" /></div>;
}

function Overview({
  data,
  loading,
  error,
  month,
  today,
  onMonthChange,
}: {
  data: OverviewResponse;
  loading: boolean;
  error: string;
  month: Date | null;
  today: Date;
  onMonthChange: (month: Date) => void;
}) {
  const metrics = data.metrics;
  const values: Record<(typeof pastelCards)[number]["key"], string> = {
    students: metrics.students.toLocaleString("en-IN"),
    teachers: metrics.teachers.toLocaleString("en-IN"),
    attendance: metrics.attendance === null ? "—" : `${metrics.attendance.toFixed(1)}%`,
    dueFees: formatMoney(metrics.dueFees, true),
  };
  const detail: Record<(typeof pastelCards)[number]["key"], string> = {
    students: "Live database total",
    teachers: "Live database total",
    attendance: metrics.attendance === null ? "No attendance marked" : "All recorded attendance",
    dueFees: "Outstanding balance",
  };
  const target: Record<(typeof pastelCards)[number]["key"], number | null> = {
    students: metrics.students,
    teachers: metrics.teachers,
    attendance: metrics.attendance,
    dueFees: metrics.dueFees,
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[minmax(210px,3fr)_minmax(0,5fr)_minmax(250px,3fr)]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {loading
          ? pastelCards.map((item) => <MetricSkeleton key={item.key} />)
          : error
            ? <Panel className="sm:col-span-2 xl:col-span-1"><ErrorText error={error} /></Panel>
            : pastelCards.map((item, index) => <MetricCard key={item.key} item={item} value={values[item.key]} target={target[item.key]} detail={detail[item.key]} index={index} />)}
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <RevenuePanel data={data} loading={loading} error={error} />
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
          <TeacherPanel teachers={data.teachers} loading={loading} error={error} />
          <UpcomingEventsPanel events={data.events} loading={loading} error={error} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-5 md:col-span-2 xl:col-span-1">
        {loading || !month ? <LoadingPanel title="Calendar" /> : error ? <Panel><ErrorText error={error} /></Panel> : <CalendarPanel month={month} onMonthChange={onMonthChange} dots={data.calendarDots} today={today} />}
        {loading ? <LoadingPanel title="Coming Up" /> : error ? <Panel><ErrorText error={error} /></Panel> : <ComingUp events={data.events} now={today} />}
        <AnnouncementsPanel />
      </div>
    </div>
  );
}

function StudentsPage({ reload }: { reload: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classOptions, setClassOptions] = useState<{ grade: number; section: string }[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [formStudent, setFormStudent] = useState<Student | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadStudents() {
    setDirectoryLoading(true);
    setDirectoryError("");
    try {
      const [studentResult, optionResult] = await Promise.all([
        requestJson<{ data: Student[] }>("/api/students"),
        requestJson<{ data: { classrooms: { grade: number; section: string }[] } }>("/api/module-options"),
      ]);
      setStudents(studentResult.data);
      setClassOptions(optionResult.data.classrooms);
    } catch (requestError) {
      setDirectoryError(requestError instanceof Error ? requestError.message : "Could not load students.");
    } finally {
      setDirectoryLoading(false);
    }
  }

  useEffect(() => { void Promise.resolve().then(loadStudents); }, []);

  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return students
      .filter((student) => !statusFilter || student.status === statusFilter)
      .filter((student) => !needle || `${student.name} ${student.email} ${student.className}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => sort === "class"
        ? a.className.localeCompare(b.className) || a.name.localeCompare(b.name)
        : sort === "name-desc"
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name));
  }, [query, sort, statusFilter, students]);
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / 20));
  const pagedStudents = visibleStudents.slice((Math.min(page, pageCount) - 1) * 20, Math.min(page, pageCount) * 20);

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const values = {
      ...raw,
      status: String(raw.status).replaceAll(" ", "_").toUpperCase(),
    };
    setSaving(true);
    setDirectoryError("");
    setNotice("");
    try {
      await requestJson(formStudent?.id ? `/api/students/${encodeURIComponent(formStudent.id)}` : "/api/students", {
        method: formStudent?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setFormStudent(undefined);
      setNotice(`Student ${formStudent?.id ? "updated" : "added"} successfully.`);
      form.reset();
      await loadStudents();
      reload();
    } catch (requestError) {
      setDirectoryError(requestError instanceof Error ? requestError.message : "Could not save this student.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDirectoryError("");
    try {
      await requestJson(`/api/students/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      setNotice(`${pendingDelete.name} was deleted.`);
      setPendingDelete(null);
      await loadStudents();
      reload();
    } catch (requestError) {
      setDirectoryError(requestError instanceof Error ? requestError.message : "Could not delete this student.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Panel>
        <PanelHeading title="Student Directory" detail="Manage student records stored in PostgreSQL" action={<button type="button" onClick={() => setFormStudent(formStudent === undefined ? null : undefined)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white hover:bg-[#262626]"><Plus size={15} />Add student</button>} />
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="float-right px-2 font-semibold">×</button></p>}
        {directoryError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{directoryError}</span><button type="button" onClick={() => void loadStudents()} className="min-h-10 font-semibold underline">Retry</button></div>}
        {formStudent !== undefined && (
          <form key={formStudent?.id ?? "new"} onSubmit={saveStudent} className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-slate-700">Full name<input name="name" required minLength={2} maxLength={100} defaultValue={formStudent?.name} placeholder="First and last name" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Email<input name="email" type="email" required maxLength={254} defaultValue={formStudent?.email} placeholder="student@example.com" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Class<select name="className" required defaultValue={formStudent?.className ?? ""} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="" disabled>{classOptions.length ? "Select class" : "No classes available"}</option>{classOptions.map((item) => <option key={`${item.grade}-${item.section}`}>Grade {item.grade} · Section {item.section}</option>)}</select></label>
            {formStudent?.id && <label className="text-xs font-medium text-slate-700">Status<select name="status" defaultValue={formStudent.status.toUpperCase().replaceAll(" ", "_")} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{["ACTIVE", "ON_LEAVE", "PENDING", "GRADUATED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>}
            <div className="flex items-end gap-2"><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#0a0a0a] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : formStudent?.id ? "Save changes" : "Create student"}</button><button type="button" onClick={() => setFormStudent(undefined)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm">Cancel</button></div>
          </form>
        )}
        {!directoryLoading && students.length > 0 && <RecordControls query={query} onQueryChange={(value) => { setQuery(value); setPage(1); }} filter={statusFilter} onFilterChange={(value) => { setStatusFilter(value); setPage(1); }} filterOptions={["Active", "On leave", "Pending", "Graduated"].map((value) => ({ value, label: value }))} sort={sort} onSortChange={(value) => { setSort(value); setPage(1); }} sortOptions={[{ value: "name", label: "Name A–Z" }, { value: "name-desc", label: "Name Z–A" }, { value: "class", label: "Class" }]} page={Math.min(page, pageCount)} pageCount={pageCount} total={visibleStudents.length} onPageChange={setPage} />}
        {directoryLoading ? <div role="status" aria-label="Loading students" className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : directoryError && students.length === 0 ? <EmptyState message="Students could not be loaded. Use Retry to reconnect." /> : !students.length ? <EmptyState message="No student records are available yet. Add or import real students to get started." /> : !pagedStudents.length ? <EmptyState message="No students match these search and filter settings." /> : (
          <div className="divide-y divide-slate-100">
            {pagedStudents.map((student) => <div key={student.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">{student.initials}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{student.name}</span><span className="block truncate text-xs text-slate-500">{student.email || "No email"}</span></span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] text-slate-600">{student.className}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] text-emerald-700">{student.status}</span>
              <div className="ml-auto flex gap-1"><button type="button" onClick={() => setFormStudent(student)} aria-label={`Edit ${student.name}`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"><Pencil size={14} />Edit</button><button type="button" onClick={() => setPendingDelete(student)} aria-label={`Delete ${student.name}`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"><Trash2 size={14} />Delete</button></div>
            </div>)}
          </div>
        )}
      </Panel>
      {pendingDelete && <ConfirmDialog title={`Delete ${pendingDelete.name}?`} description="This permanently deletes the student and related attendance, examination results, invoices, and academic records." busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteStudent()} />}
    </>
  );
}

function TeachersPage({ reload }: { reload: () => void }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formTeacher, setFormTeacher] = useState<Teacher | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  async function loadTeachers() {
    setLoading(true);
    setError("");
    try {
      const result = await requestJson<{ data: Teacher[] }>("/api/teachers");
      setTeachers(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load teachers.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void Promise.resolve().then(loadTeachers); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return teachers
      .filter((teacher) => !statusFilter || teacher.status === statusFilter)
      .filter((teacher) => !needle || `${teacher.employeeNumber} ${teacher.firstName} ${teacher.lastName} ${teacher.email} ${teacher.designation ?? ""}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => sort === "name-desc"
        ? `${b.lastName} ${b.firstName}`.localeCompare(`${a.lastName} ${a.firstName}`)
        : sort === "role"
          ? (a.designation ?? "").localeCompare(b.designation ?? "")
          : `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  }, [query, sort, statusFilter, teachers]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const paged = filtered.slice((Math.min(page, pageCount) - 1) * 20, Math.min(page, pageCount) * 20);

  async function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.status = String(values.status).replaceAll(" ", "_").toUpperCase();
    setSaving(true);
    setError("");
    try {
      await requestJson(formTeacher?.id ? `/api/teachers/${encodeURIComponent(formTeacher.id)}` : "/api/teachers", {
        method: formTeacher?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setNotice(`Teacher ${formTeacher?.id ? "updated" : "added"} successfully.`);
      setFormTeacher(undefined);
      await loadTeachers();
      reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this teacher.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeacher() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      await requestJson(`/api/teachers/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      setNotice(`${pendingDelete.firstName} ${pendingDelete.lastName} was deleted.`);
      setPendingDelete(null);
      await loadTeachers();
      reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this teacher.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Panel>
        <PanelHeading title="Teacher Directory" detail="Manage staff records from PostgreSQL" action={<button type="button" onClick={() => setFormTeacher(formTeacher === undefined ? null : undefined)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white hover:bg-[#262626]"><Plus size={15} />Add teacher</button>} />
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="float-right px-2 font-semibold">×</button></p>}
        {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void loadTeachers()} className="min-h-10 font-semibold underline">Retry</button></div>}
        {formTeacher !== undefined && <form key={formTeacher?.id ?? "new"} onSubmit={saveTeacher} className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">Employee number<input name="employeeNumber" required maxLength={30} defaultValue={formTeacher?.employeeNumber} placeholder="EMP-001" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">First name<input name="firstName" required maxLength={80} defaultValue={formTeacher?.firstName} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Last name<input name="lastName" required maxLength={80} defaultValue={formTeacher?.lastName} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Email<input name="email" type="email" required maxLength={254} defaultValue={formTeacher?.email} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Phone<input name="phone" type="tel" maxLength={40} defaultValue={formTeacher?.phone ?? ""} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Subject / designation<input name="designation" maxLength={120} defaultValue={formTeacher?.designation ?? ""} placeholder="e.g. Mathematics" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Status<select name="status" defaultValue={formTeacher?.status ?? "ACTIVE"} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{["ACTIVE", "ON_LEAVE", "INACTIVE"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
          <div className="flex items-end gap-2"><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#0a0a0a] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : formTeacher?.id ? "Save changes" : "Create teacher"}</button><button type="button" onClick={() => setFormTeacher(undefined)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm">Cancel</button></div>
        </form>}
        {!loading && teachers.length > 0 && <RecordControls query={query} onQueryChange={(value) => { setQuery(value); setPage(1); }} filter={statusFilter} onFilterChange={(value) => { setStatusFilter(value); setPage(1); }} filterOptions={["ACTIVE", "ON_LEAVE", "INACTIVE"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} sort={sort} onSortChange={(value) => { setSort(value); setPage(1); }} sortOptions={[{ value: "name", label: "Name A–Z" }, { value: "name-desc", label: "Name Z–A" }, { value: "role", label: "Subject / role" }]} page={Math.min(page, pageCount)} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />}
        {loading ? <div role="status" aria-label="Loading teachers" className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : !teachers.length ? <EmptyState message="No teachers are in the directory yet. Add a staff record to get started." /> : !paged.length ? <EmptyState message="No teachers match these search and filter settings." /> : <div className="divide-y divide-slate-100">{paged.map((teacher, index) => <div key={teacher.id} className="flex flex-wrap items-center gap-3 py-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700"][index % 4]}`}>{initials(teacher.firstName, teacher.lastName)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{teacher.firstName} {teacher.lastName}</span><span className="block truncate text-xs text-slate-500">{teacher.email} · {teacher.employeeNumber}</span></span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] text-slate-600">{teacher.designation ?? teacher.assignments[0]?.subject.name ?? "No subject"}</span>
          <span className={`rounded-full px-3 py-1.5 text-[10px] ${teacher.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{teacher.status?.replaceAll("_", " ")}</span>
          <div className="ml-auto flex gap-1"><button type="button" onClick={() => setFormTeacher(teacher)} aria-label={`Edit ${teacher.firstName} ${teacher.lastName}`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"><Pencil size={14} />Edit</button><button type="button" onClick={() => setPendingDelete(teacher)} aria-label={`Delete ${teacher.firstName} ${teacher.lastName}`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"><Trash2 size={14} />Delete</button></div>
        </div>)}</div>}
      </Panel>
      {pendingDelete && <ConfirmDialog title={`Delete ${pendingDelete.firstName} ${pendingDelete.lastName}?`} description="This permanently deletes the teacher and removes their teaching assignments. Existing attendance and exams remain, but will no longer show this teacher as their creator." busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteTeacher()} />}
    </>
  );
}

function CalendarPage({ month, onMonthChange, data, loading, error }: { month: Date | null; onMonthChange: (date: Date) => void; data: OverviewResponse; loading: boolean; error: string }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      {loading || !month ? <LoadingPanel title="Calendar" /> : error ? <Panel><ErrorText error={error} /></Panel> : <CalendarPanel month={month} onMonthChange={onMonthChange} dots={data.calendarDots} today={new Date(data.generatedAt)} />}
      {error ? <Panel><ErrorText error={error} /></Panel> : <UpcomingEventsPanel events={data.events} loading={loading} error={error} />}
    </div>
  );
}

function ModuleLinks({ current }: { current: Section }) {
  const modules: { label: string; href: string; section: Section }[] = [
    { label: "Attendance", href: "/dashboard/attendance", section: "attendance" },
    { label: "Examinations", href: "/dashboard/examinations", section: "examinations" },
    { label: "Fees", href: "/dashboard/fees", section: "fees" },
    { label: "Academic records", href: "/dashboard/academic-records", section: "academic-records" },
  ];
  return (
    <nav aria-label="School modules" className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {modules.map((module) => <Link key={module.section} href={module.href} aria-current={current === module.section ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${current === module.section ? "bg-[#0a0a0a] text-white" : "bg-white/80 text-slate-600 hover:bg-white"}`}>{module.label}</Link>)}
    </nav>
  );
}

export function AdminDashboard({ initialSection = "overview" }: { initialSection?: Section }) {
  const pathname = usePathname();
  const section = pathname === "/" ? initialSection : sectionFromPath(pathname);
  const [data, setData] = useState<OverviewResponse>(fallbackOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState<Date | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    function closeMenus(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setMenuOpen(false);
        return;
      }
      if (event instanceof PointerEvent && event.target instanceof Node) {
        if (!notificationsRef.current?.contains(event.target)) setNotificationsOpen(false);
        if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const url = monthKey ? `/api/dashboard?month=${encodeURIComponent(monthKey)}` : "/api/dashboard";
    requestJson<{ data: OverviewResponse }>(url)
      .then((result) => {
        if (!active) return;
        setData(result.data);
        if (result.data.calendarMonth) setMonth(new Date(result.data.calendarMonth));
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Could not load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [monthKey, refreshKey]);

  function changeMonth(next: Date) {
    setLoading(true);
    setMonth(next);
    setMonthKey(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  const currentNav = useMemo(() => navItems.find((item) => item.section === section) ?? navItems[0], [section]);
  const title = sectionTitles[section];

  return (
    <main className="min-h-screen bg-[#f2f4f7] p-3 text-[#0a0a0a] sm:p-5 lg:p-8">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1660px] rounded-[28px] border border-white bg-white/65 p-3 shadow-[0_24px_80px_rgba(42,50,65,0.08)] backdrop-blur-xl sm:rounded-[36px] sm:p-5 lg:min-h-[calc(100vh-4rem)] lg:p-7">
        <header className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:mb-8">
          <Link href="/dashboard" className="shrink-0 text-lg font-bold tracking-tight text-[#0a0a0a] sm:text-xl">EduManage</Link>
          <nav aria-label="Primary navigation" className="order-3 flex w-full min-w-0 max-w-full flex-none items-center justify-start gap-1 overflow-x-auto rounded-full border border-white bg-white/75 p-1 shadow-sm sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:gap-2 sm:px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.section === section || (item.section === "examinations" && section === "fees");
              if (item.section !== "examinations") return (
                <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} aria-current={active ? "page" : undefined} className={`flex size-9 shrink-0 items-center justify-center rounded-full transition sm:size-10 ${active ? "bg-[#0a0a0a] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-[#0a0a0a]"}`}>
                  <Icon size={17} strokeWidth={1.9} />
                </Link>
              );
              return (
                <div key={item.href} className="relative flex shrink-0 items-center">
                  <Link href={item.href} aria-label={item.label} title={item.label} aria-current={active ? "page" : undefined} className={`flex size-9 items-center justify-center rounded-full transition sm:size-10 ${active ? "bg-[#0a0a0a] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-[#0a0a0a]"}`}><Icon size={17} strokeWidth={1.9} /></Link>
                  <button type="button" aria-label="Choose examinations or fees" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="-ml-1 rounded-full p-1 text-slate-500 hover:bg-slate-100"><ChevronDown size={12} /></button>
                  {menuOpen && <div className="absolute left-0 top-12 z-20 min-w-40 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
                    {[["Examinations", "/dashboard/examinations"], ["Fees", "/dashboard/fees"], ["Academic records", "/dashboard/academic-records"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">{label}</Link>)}
                  </div>}
                </div>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative" ref={notificationsRef}>
              <button type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }} className="relative flex size-9 items-center justify-center rounded-full border border-white bg-white text-slate-600 shadow-[0_5px_14px_rgba(30,41,59,0.08)] transition hover:-translate-y-0.5 hover:text-[#e8622c] sm:size-10">
                <Bell size={17} />
                {data.events.length > 0 && <span aria-label={`${data.events.length} upcoming notifications`} className="absolute right-1 top-1 size-2 rounded-full bg-[#e8622c] ring-2 ring-white" />}
              </button>
              {notificationsOpen && <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.16 }} className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_18px_55px_rgba(30,41,59,0.16)]">
                <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Notifications</h2><span className="text-[10px] text-slate-400">Upcoming</span></div>
                {loading ? <p className="py-4 text-center text-xs text-slate-500">Loading latest events…</p> : data.events.length ? <div className="space-y-1">{data.events.slice(0, 4).map((event) => <Link key={event.id} href={event.kind === "exam" ? "/dashboard/examinations" : "/dashboard/fees"} onClick={() => setNotificationsOpen(false)} className="block rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"><span className="block truncate text-xs font-semibold text-slate-800">{event.title}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{eventTime(event)} · {event.detail}</span></Link>)}</div> : <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">{error ? "Notifications are unavailable while the database is offline." : "No upcoming events to notify you about."}</p>}
                <Link href="/dashboard/calendar" onClick={() => setNotificationsOpen(false)} className="mt-3 block rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Open school calendar</Link>
              </motion.div>}
            </div>
            <div className="relative" ref={profileRef}>
              <button type="button" aria-label="Administrator profile" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }} className="flex size-9 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-semibold text-white shadow-[0_5px_14px_rgba(30,41,59,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:size-10"><UserRound size={17} /></button>
              {profileOpen && <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.16 }} className="absolute right-0 top-12 z-30 w-56 rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_18px_55px_rgba(30,41,59,0.16)]">
                <div className="mb-2 rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs font-semibold text-slate-900">Administrator</p><p className="mt-1 text-[10px] text-slate-500">School management</p></div>
                {[["Dashboard overview", "/dashboard"], ["Manage students", "/dashboard/students"], ["Manage teachers", "/dashboard/teachers"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">{label}</Link>)}
              </motion.div>}
            </div>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">EduManage / {currentNav.label}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          </div>
          <p className="text-xs text-slate-500">{loading ? "Syncing database…" : error ? "Database unavailable" : "Live PostgreSQL data"}</p>
        </div>

        {section === "overview" ? (
          <Overview data={data} loading={loading} error={error} month={month} today={data.generatedAt ? new Date(data.generatedAt) : new Date(0)} onMonthChange={changeMonth} />
        ) : section === "students" ? (
          <StudentsPage reload={() => setRefreshKey((value) => value + 1)} />
        ) : section === "teachers" ? (
          <TeachersPage reload={() => setRefreshKey((value) => value + 1)} />
        ) : section === "calendar" ? (
          <CalendarPage month={month} onMonthChange={changeMonth} data={data} loading={loading} error={error} />
        ) : (
          <>
            <ModuleLinks current={section} />
            {section === "attendance" ? <SchoolModule section="Attendance" /> :
              section === "examinations" ? <SchoolModule section="Examinations" /> :
                section === "fees" ? <SchoolModule section="Fees" /> :
                  <SchoolModule section="Academic records" />}
          </>
        )}
      </div>
    </main>
  );
}
