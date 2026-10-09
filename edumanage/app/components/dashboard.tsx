"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { activities, schedule, type Student, type UserRole } from "../data";
import { Icon, type IconName } from "./ui-icon";

const navigation: { label: string; icon: IconName; count?: string }[] = [
  { label: "Overview", icon: "overview" },
  { label: "Students", icon: "students", count: "1,248" },
  { label: "Teachers", icon: "teachers" },
  { label: "Attendance", icon: "attendance" },
  { label: "Examinations", icon: "exams" },
  { label: "Fees", icon: "fees" },
  { label: "Academic records", icon: "records" },
];

const roleStats: Record<UserRole, { label: string; value: string; change: string; icon: IconName; accent: string }[]> = {
  Admin: [
    { label: "Total students", value: "1,248", change: "+12.8%", icon: "students", accent: "bg-[#e7eee8] text-primary" },
    { label: "Teaching staff", value: "64", change: "+4.2%", icon: "teachers", accent: "bg-[#edf1e7] text-[#657947]" },
    { label: "Avg. attendance", value: "94.6%", change: "+2.4%", icon: "attendance", accent: "bg-[#e7eee8] text-primary" },
    { label: "Fees collected", value: "₹8.42L", change: "+8.1%", icon: "fees", accent: "bg-[#f6f0e2] text-[#9a6f28]" },
  ],
  Teacher: [
    { label: "My students", value: "126", change: "Across 4 classes", icon: "students", accent: "bg-[#e7eee8] text-primary" },
    { label: "Classes today", value: "5", change: "Next at 10:30 AM", icon: "book", accent: "bg-[#edf1e7] text-[#657947]" },
    { label: "Avg. attendance", value: "96.2%", change: "+1.8% this week", icon: "attendance", accent: "bg-[#e7eee8] text-primary" },
    { label: "To grade", value: "12", change: "Due this week", icon: "exams", accent: "bg-[#f6f0e2] text-[#9a6f28]" },
  ],
  Student: [
    { label: "My attendance", value: "96.4%", change: "+1.2% this month", icon: "attendance", accent: "bg-[#e7eee8] text-primary" },
    { label: "Current average", value: "A−", change: "+0.3 this term", icon: "records", accent: "bg-[#edf1e7] text-[#657947]" },
    { label: "Assignments", value: "8 / 10", change: "2 due this week", icon: "book", accent: "bg-[#e7eee8] text-primary" },
    { label: "Fee balance", value: "₹4,500", change: "Due 15 Oct", icon: "fees", accent: "bg-[#f6f0e2] text-[#9a6f28]" },
  ],
};

const sectionDescriptions: Record<string, string> = {
  Overview: "Here’s what’s happening across your school today.",
  Students: "Manage enrollment, student profiles, and class assignments.",
  Teachers: "Your teaching team and their class assignments at a glance.",
  Attendance: "A live view of attendance trends across the school.",
  Examinations: "Keep track of assessments, results, and upcoming exams.",
  Fees: "Monitor collections, outstanding balances, and recent payments.",
  "Academic records": "Student progress, grades, and academic history.",
  Settings: "Manage your school workspace and preferences.",
};

type DashboardNotice = {
  title: string;
  message: string;
};

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstControl = dialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea");
    firstControl?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10231d]/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-dialog-title"
        ref={dialogRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="dashboard-dialog-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const sectionRows: Record<string, { title: string; detail: string; status: string }[]> = {
  Teachers: [
    { title: "James Wilson", detail: "Mathematics · Grades 9–11", status: "Active" },
    { title: "Priya Sharma", detail: "Science · Grades 8–10", status: "Active" },
    { title: "Anna Taylor", detail: "English · Grades 10–12", status: "On leave" },
    { title: "David Chen", detail: "History · Grades 8–10", status: "Inactive" },
  ],
  Attendance: [
    { title: "Grade 10 · Section A", detail: "28 of 30 students present", status: "93%" },
    { title: "Grade 9 · Section B", detail: "31 of 32 students present", status: "97%" },
    { title: "Grade 11 · Section A", detail: "26 of 29 students present", status: "90%" },
  ],
  Examinations: [
    { title: "Mathematics · Midterm", detail: "Grade 10 · 30 students", status: "Oct 14" },
    { title: "Science · Practical", detail: "Grade 9 · 32 students", status: "Oct 17" },
    { title: "English · Literature", detail: "Grade 11 · 29 students", status: "Oct 21" },
  ],
  Fees: [
    { title: "Term 2 tuition", detail: "Due Oct 15 · 1,248 invoices", status: "₹6.18L pending" },
    { title: "Transport fees", detail: "Due Oct 20 · 386 invoices", status: "₹1.24L pending" },
    { title: "Recent collection", detail: "Received today · Marcus Reed", status: "₹12,500 paid" },
  ],
  "Academic records": [
    { title: "Mathematics", detail: "Grade 10 · Class average 84%", status: "A−" },
    { title: "Science", detail: "Grade 10 · Class average 81%", status: "B+" },
    { title: "English", detail: "Grade 10 · Class average 88%", status: "A" },
  ],
  Settings: [
    { title: "School profile", detail: "Northstar Academy · Update school details", status: "Manage" },
    { title: "Academic year", detail: "2025–2026 · Term 2", status: "Current" },
    { title: "Notifications", detail: "Attendance, fees, and academic updates", status: "Enabled" },
  ],
};

function SectionPanel({
  section,
  onAction,
}: {
  section: string;
  onAction: () => void;
}) {
  const rows = sectionRows[section] ?? [];
  const action = {
    Teachers: "Add teacher",
    Attendance: "Mark attendance",
    Examinations: "Schedule exam",
    Fees: "Create invoice",
    "Academic records": "Add record",
    Settings: "Edit settings",
  }[section] ?? "Add new";

  return (
    <section className="dashboard-card overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8eee8] px-6 py-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{section} at a glance</h2>
          <p className="mt-1 text-xs text-slate-500">Sample school information for the 2025–2026 academic year.</p>
        </div>
        <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-white transition hover:bg-[#173528]">
          <Icon name="plus" className="h-4 w-4" />
          {action}
        </button>
      </div>
      <div className="divide-y divide-[#edf1ed]">
        {rows.map((row) => (
          <div className="flex items-center gap-4 px-6 py-4" key={row.title}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e7eee8] text-primary">
              <Icon name={section === "Teachers" ? "teachers" : section === "Fees" ? "fees" : section === "Attendance" ? "attendance" : section === "Examinations" ? "exams" : section === "Settings" ? "settings" : "records"} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{row.title}</p>
              <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
            </div>
            <span className={`status-badge shrink-0 ${
              row.status === "Active" ? "status-active" :
              row.status === "Pending" ? "status-pending" :
              row.status === "On leave" ? "status-on-leave" :
              row.status === "Inactive" ? "status-inactive" : "status-neutral"
            }`}>{row.status}</span>
            <button
              type="button"
              onClick={() => onAction()}
              aria-label={`View ${row.title}`}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon name="chevron" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sidebar({
  role,
  activeSection,
  onNavigate,
  onClose,
  onNotice,
}: {
  role: UserRole;
  activeSection: string;
  onNavigate: (section: string) => void;
  onClose: () => void;
  onNotice: (notice: DashboardNotice) => void;
}) {
  const userName = role === "Student" ? "Olivia Rhye" : "Alex Morgan";

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col bg-primary px-4 pb-5 pt-6 text-slate-300">
      <div className="mb-9 flex items-center gap-3 px-2">
        <button
          type="button"
          onClick={() => onNavigate("Overview")}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="EduManage home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Icon name="book" className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold tracking-tight text-white">EduManage</span>
            <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-slate-400">Northstar Academy</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-3 px-3 text-[11px] font-medium text-slate-400">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigation.map((item) => {
          const isActive = activeSection === item.label;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.label)}
              aria-current={isActive ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
                isActive
                  ? "bg-accent font-semibold text-primary"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.count && (
                <span className={`text-[11px] ${isActive ? "text-teal-200" : "text-slate-500"}`}>{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <button
            type="button"
            onClick={() =>
              onNotice({
                title: "Academic year",
                message: "Northstar Academy is currently in Term 2 of the 2025–2026 academic year.",
              })
            }
            className="mb-2 flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-medium text-slate-200">Academic year</span>
            <Icon name="chevron" className="h-4 w-4 rotate-90 text-slate-500" />
          </button>
          <p className="text-[11px] text-slate-400">2025 – 2026</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[68%] rounded-full bg-accent" />
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Term 2 · 68% complete</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("Settings")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
            activeSection === "Settings" ? "bg-teal-400/15 text-teal-300" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
          Settings
        </button>
        <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] px-2 pt-4">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${role === "Student" ? "bg-violet-200 text-violet-900" : "bg-orange-200 text-orange-900"}`}>
            {role === "Student" ? "OR" : "AM"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{userName}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{role === "Admin" ? "School administrator" : role}</p>
          </div>
          <button
            type="button"
            aria-label="Account options"
            onClick={() => onNotice({ title: "Account options", message: "Account settings are not connected in this demo." })}
            className="rounded-md p-1 text-slate-500 hover:text-white"
          >
            <Icon name="dots" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  stat,
  index,
}: {
  stat: (typeof roleStats)[UserRole][number];
  index: number;
}) {
  return (
    <article className="dashboard-card rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.accent}`}>
          <Icon name={stat.icon} className="h-5 w-5" />
        </span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
          index === 3 && stat.label === "Fee balance" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {index !== 3 || stat.label !== "Fee balance" ? <Icon name="trend" className="h-3 w-3" /> : null}
          {stat.change}
        </span>
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-500">{stat.label}</p>
      <p className="mt-1 text-[25px] font-semibold tracking-tight text-slate-900">{stat.value}</p>
    </article>
  );
}

function StatCardSkeleton() {
  return (
    <article aria-hidden="true" className="dashboard-card rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div className="skeleton size-10 rounded-xl" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton mt-5 h-3 w-28" />
      <div className="skeleton mt-2 h-8 w-24" />
    </article>
  );
}

function StudentTable({
  query,
  studentList,
  statusFilter,
  onStatusFilterChange,
  onAddStudent,
  onImportStudents,
  onViewStudent,
  onNotice,
  onViewAll,
  isDatabaseConnected,
  isLoading,
}: {
  query: string;
  studentList: Student[];
  statusFilter: Student["status"] | "All";
  onStatusFilterChange: (status: Student["status"] | "All") => void;
  onAddStudent: () => void;
  onImportStudents: (file: File) => void;
  onViewStudent: (student: Student) => void;
  onNotice: (notice: DashboardNotice) => void;
  onViewAll: () => void;
  isDatabaseConnected: boolean;
  isLoading: boolean;
}) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const filteredStudents = useMemo(
    () =>
      studentList.filter((student) =>
        (statusFilter === "All" || student.status === statusFilter) &&
        `${student.name} ${student.className} ${student.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, statusFilter, studentList],
  );

  return (
    <section className="dashboard-card overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recently enrolled students</h2>
          <p className="mt-1 text-xs text-slate-500">A quick look at your student directory</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
            <Icon name="filter" className="h-4 w-4" />
            Filter
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "All" || value === "Active" || value === "On leave" || value === "Pending" || value === "Inactive" || value === "Graduated") {
                  onStatusFilterChange(value);
                }
              }}
              aria-label="Filter students by status"
              className="max-w-24 cursor-pointer bg-transparent text-xs outline-none"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="On leave">On leave</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
            </select>
          </label>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onImportStudents(file);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={!isDatabaseConnected}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import CSV
          </button>
          <button type="button" onClick={onAddStudent} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition hover:bg-[#173528]">
            <Icon name="plus" className="h-4 w-4" />
            Add student
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="dashboard-table w-full min-w-[650px] text-left">
          <thead className="bg-[#f6f7f5]">
            <tr className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-5 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Attendance</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <tr aria-hidden="true" key={`student-skeleton-${index}`}>
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="skeleton size-9 rounded-full" /><span className="flex flex-col gap-2"><span className="skeleton h-3 w-28" /><span className="skeleton h-2.5 w-36" /></span></div></td>
                  <td className="px-4 py-4"><span className="skeleton block h-3 w-28" /></td>
                  <td className="px-4 py-4"><span className="skeleton block h-3 w-14" /></td>
                  <td className="px-4 py-4"><span className="skeleton block h-6 w-16 rounded-full" /></td>
                  <td className="px-6 py-4" />
                </tr>
              ))
            ) : filteredStudents.map((student) => (
              <StudentRow
                key={student.email}
                student={student}
                onView={() => onViewStudent(student)}
                onNotice={() =>
                  onNotice({
                    title: "Student options",
                    message: isDatabaseConnected
                      ? `${student.name} is in the student directory. Editing is not available yet.`
                      : `You’re viewing sample data for ${student.name}. Connect PostgreSQL to save student records.`,
                  })
                }
              />
            ))}
            {!isLoading && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#edf1ed] text-primary">
                      <Icon name="students" className="size-5" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">No students found</p>
                    <p className="text-xs text-muted">
                      {query
                        ? "Try changing your search or status filter."
                        : isDatabaseConnected
                          ? "There are no student records in PostgreSQL yet. Add a student or import your real student CSV."
                          : "Student records are unavailable until PostgreSQL is connected."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
        <p className="text-xs text-slate-500">
          {isLoading
            ? "Loading student records..."
            : <>Showing <span className="font-medium text-slate-700">{filteredStudents.length}</span> {isDatabaseConnected ? "students" : "sample students"}</>}
        </p>
        <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
          View all students <Icon name="arrow" className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function StudentRow({
  student,
  onView,
  onNotice,
}: {
  student: Student;
  onView: () => void;
  onNotice: () => void;
}) {
  const statusClass: Record<Student["status"], string> = {
    Active: "status-active",
    Pending: "status-pending",
    "On leave": "status-on-leave",
    Inactive: "status-inactive",
    Graduated: "status-neutral",
  };

  return (
    <tr className="transition hover:bg-slate-50/60">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${student.avatarColor}`}>{student.initials}</span>
          <div className="min-w-0">
            <button type="button" onClick={onView} className="text-left text-xs font-semibold text-slate-800 hover:text-[#32745d]">
              {student.name}
            </button>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{student.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-600">{student.className}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">{student.attendance}</span>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-teal-500" style={{ width: student.attendance }} />
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`status-badge ${statusClass[student.status]}`}>{student.status}</span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button type="button" onClick={onNotice} aria-label={`More options for ${student.name}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <Icon name="dots" className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}

function AttendanceChart({
  period,
  onPeriodChange,
  isLoading,
}: {
  period: "This week" | "This month";
  onPeriodChange: () => void;
  isLoading: boolean;
}) {
  return (
    <section className="dashboard-card dashboard-card-primary overflow-hidden rounded-xl border p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Attendance overview</h2>
          <p className="mt-1 text-xs text-white/65">School-wide attendance {period.toLowerCase()}</p>
        </div>
        <button type="button" onClick={onPeriodChange} className="rounded-lg border border-white/20 px-2.5 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/10">
          {period} <span className="ml-1 text-white/60">⌄</span>
        </button>
      </div>
      {isLoading ? (
        <div aria-label="Loading attendance chart" role="status" className="mt-5">
          <div className="skeleton skeleton-dark h-8 w-24" />
          <div className="skeleton skeleton-dark mt-5 h-[145px] w-full" />
        </div>
      ) : (
      <>
      <div className="mt-5 flex items-center gap-2">
        <span className="text-[27px] font-semibold tracking-tight text-white">{period === "This week" ? "94.6%" : "93.8%"}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-[#f1d79f]">
          <Icon name="trend" className="h-3 w-3" /> {period === "This week" ? "2.4%" : "1.6%"}
        </span>
      </div>
      <div className="relative mt-3 h-[145px] pl-8">
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-5 text-[9px] text-white/55">
          <span>100%</span><span>90%</span><span>80%</span><span>70%</span>
        </div>
        <svg viewBox="0 0 600 130" preserveAspectRatio="none" className="h-[120px] w-full overflow-visible" role="img" aria-label={`Attendance trend for ${period.toLowerCase()}`}>
          <defs>
            <linearGradient id="attendance-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E5B85C" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E5B85C" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 10H600M0 47H600M0 84H600M0 121H600" stroke="#ffffff" strokeOpacity="0.16" strokeDasharray="3 5" />
          <path d="M0 87 C45 81 52 53 100 61 S160 84 200 67 S260 34 300 48 S360 76 400 49 S460 35 500 43 S560 22 600 27 L600 130 L0 130Z" fill="url(#attendance-fill)" />
          <path d="M0 87 C45 81 52 53 100 61 S160 84 200 67 S260 34 300 48 S360 76 400 49 S460 35 500 43 S560 22 600 27" fill="none" stroke="#E5B85C" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <circle cx="600" cy="27" r="4" fill="#E5B85C" stroke="#1F3D2F" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-white/55">
          {period === "This week" ? (
            <><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></>
          ) : (
            <><span>Wk 1</span><span>Wk 2</span><span>Wk 3</span><span>Wk 4</span><span>Wk 5</span><span>Wk 6</span><span>Wk 7</span></>
          )}
        </div>
      </div>
      </>
      )}
    </section>
  );
}

function ScheduleCard({
  role,
  onNotice,
}: {
  role: UserRole;
  onNotice: (notice: DashboardNotice) => void;
}) {
  return (
    <section className="dashboard-card rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{role === "Student" ? "My class schedule" : "Today’s schedule"}</h2>
          <p className="mt-1 text-xs text-slate-500">Monday, October 6</p>
        </div>
        <button
          type="button"
          onClick={() => onNotice({ title: "Schedule options", message: "Timetable editing will be available when scheduling is connected." })}
          aria-label="More schedule options"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <Icon name="dots" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {schedule.map((item) => (
          <div className="flex gap-3" key={item.time}>
            <div className="w-[62px] shrink-0 pt-0.5 text-[10px] font-medium text-slate-500">{item.time}</div>
            <div className={`mt-0.5 h-10 w-1 shrink-0 rounded-full ${item.color}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">{item.subject}</p>
              <p className="mt-1 text-[10px] text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNotice({ title: "Today’s timetable", message: "There are 3 sample classes on today’s timetable." })}
        className="mt-5 flex w-full items-center justify-center gap-1 border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700 hover:text-teal-800"
      >
        View full timetable <Icon name="arrow" className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

function ActivityCard({ onNotice }: { onNotice: (notice: DashboardNotice) => void }) {
  return (
    <section className="dashboard-card rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <p className="mt-1 text-xs text-slate-500">The latest updates from your school</p>
        </div>
        <button
          type="button"
          onClick={() => onNotice({ title: "Recent activity", message: "Showing the 3 latest sample updates from Northstar Academy." })}
          aria-label="More activity options"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <Icon name="dots" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 divide-y divide-slate-100">
        {activities.map((activity) => (
          <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={activity.text}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${activity.color}`}>{activity.initials}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-5 text-slate-700">{activity.text}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentAcademicSnapshot({ onNotice }: { onNotice: (notice: DashboardNotice) => void }) {
  return (
    <section className="dashboard-card rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">My academic progress</h2>
          <p className="mt-1 text-xs text-slate-500">Term 2 grades · Grade 10, Section A</p>
        </div>
        <button
          type="button"
          onClick={() => onNotice({ title: "Academic report", message: "This sample academic report is not connected to a student record yet." })}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Icon name="download" className="h-3.5 w-3.5" /> Report
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {[
          { subject: "Mathematics", teacher: "Mr. James Wilson", grade: "A", score: 92, color: "bg-indigo-500" },
          { subject: "Science", teacher: "Ms. Priya Sharma", grade: "A−", score: 87, color: "bg-emerald-500" },
          { subject: "English", teacher: "Mrs. Anna Taylor", grade: "B+", score: 84, color: "bg-amber-500" },
        ].map((subject) => (
          <div className="flex items-center gap-3" key={subject.subject}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600`}>
              <Icon name="book" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">{subject.subject}</p>
                <p className="text-xs font-semibold text-slate-800">{subject.grade}</p>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">{subject.teacher} · {subject.score}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${subject.color}`} style={{ width: `${subject.score}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onNotice({ title: "Academic records", message: "You’re viewing Olivia’s sample grades for Term 2." })} className="mt-5 flex w-full items-center justify-center gap-1 border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700 hover:text-teal-800">
        View academic records <Icon name="arrow" className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

export function Dashboard() {
  const [role, setRole] = useState<UserRole>("Admin");
  const [activeSection, setActiveSection] = useState("Overview");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<"loading" | "connected" | "offline">("loading");
  const [studentSavePending, setStudentSavePending] = useState(false);
  const [studentSaveError, setStudentSaveError] = useState("");
  const [statusFilter, setStatusFilter] = useState<Student["status"] | "All">("All");
  const [dialog, setDialog] = useState<"add-student" | "student" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [notice, setNotice] = useState<DashboardNotice | null>(null);
  const [headerPanel, setHeaderPanel] = useState<"notifications" | "account" | "date" | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"This week" | "This month">("This week");
  const [dateRange, setDateRange] = useState("Oct 1 – Oct 31, 2025");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stats = roleStats[role];
  const displayedStats = stats.map((stat, index) => {
    if (role !== "Admin" || index !== 0) return stat;
    return {
      ...stat,
      value: databaseStatus === "connected" ? studentList.length.toLocaleString() : "Unavailable",
    };
  });
  const greeting = role === "Student" ? "Welcome back, Olivia" : "Good morning, Alex";
  const userName = role === "Student" ? "Olivia Rhye" : "Alex Morgan";

  useEffect(() => {
    let active = true;
    fetch("/api/students")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(typeof result.error === "string" ? result.error : "Could not load students.");
        }
        if (active && Array.isArray(result.data)) {
          setStudentList(result.data as Student[]);
          setDatabaseStatus("connected");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStudentList([]);
        setDatabaseStatus("offline");
        console.error(
          "Could not load students from PostgreSQL.",
          error instanceof Error ? error.message : error,
        );
      });

    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => {
      active = false;
      window.removeEventListener("keydown", focusSearch);
    };
  }, []);

  function showNotice(nextNotice: DashboardNotice) {
    setNotice(nextNotice);
    setHeaderPanel(null);
  }

  function navigate(section: string) {
    setActiveSection(section);
    setSidebarOpen(false);
    setHeaderPanel(null);
  }

  function exportStudents() {
    if (databaseStatus !== "connected" || studentList.length === 0) return;

    const header = ["Name", "Email", "Class", "Attendance", "Status"];
    const rows = studentList.map((student) => [
      student.name,
      student.email,
      student.className,
      student.attendance,
      student.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "edumanage-students.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice({ title: "Student list exported", message: `${studentList.length} database student records were downloaded as a CSV.` });
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const className = String(formData.get("className") ?? "").trim();

    if (!name || !email || !className) return;
    if (studentList.some((student) => student.email.toLowerCase() === email.toLowerCase())) {
      showNotice({ title: "Student already exists", message: "A student with this email is already in the student list." });
      return;
    }

    setStudentSavePending(true);
    setStudentSaveError("");
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, className }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Could not save this student.");
      }

      const savedStudent = result.data as Student;
      setStudentList((currentStudents) => [savedStudent, ...currentStudents]);
      setDialog(null);
      setQuery("");
      setStatusFilter("All");
      setActiveSection("Students");
      showNotice({ title: "Student added", message: `${savedStudent.name} was saved to PostgreSQL.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this student.";
      setStudentSaveError(message);
    } finally {
      setStudentSavePending(false);
    }
  }

  async function importStudents(file: File) {
    if (file.size > 1024 * 1024) {
      showNotice({ title: "CSV is too large", message: "Choose a CSV file smaller than 1 MB." });
      return;
    }

    let importedCount: number | null = null;
    try {
      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: await file.text(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Could not import students.");
      }
      importedCount = result.imported;

      const studentsResponse = await fetch("/api/students");
      const studentsResult = await studentsResponse.json();
      if (!studentsResponse.ok || !Array.isArray(studentsResult.data)) {
        throw new Error("Students were imported, but the refreshed directory could not be loaded.");
      }

      setStudentList(studentsResult.data as Student[]);
      setDatabaseStatus("connected");
      setStatusFilter("All");
      setQuery("");
      showNotice({
        title: "Students imported",
        message: `${result.imported} real student records were saved to PostgreSQL.${result.ignoredColumns?.length ? ` Ignored columns: ${result.ignoredColumns.join(", ")}.` : ""}`,
      });
    } catch (error) {
      showNotice({
        title: importedCount === null ? "Student import failed" : "Students imported; refresh failed",
        message: error instanceof Error
          ? error.message
          : importedCount === null
            ? "Could not import students."
            : "The imported records are saved. Reload the page to refresh the directory.",
      });
    }
  }

  return (
    <div className="dashboard-canvas min-h-screen text-foreground">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarOpen ? "flex" : "hidden"} lg:flex`}>
        <Sidebar
          role={role}
          activeSection={activeSection}
          onNavigate={navigate}
          onClose={() => setSidebarOpen(false)}
          onNotice={showNotice}
        />
      </div>

      <main className="min-h-screen lg:ml-[264px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dce5dd] bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 sm:flex">
              <Icon name="search" className="h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students..."
                aria-label="Search students"
                className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
              />
              <kbd className="whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</kbd>
            </div>
            <span className="truncate text-sm font-semibold text-primary sm:hidden">EduManage</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center rounded-lg bg-[#e8eee8] p-1 md:flex" aria-label="Select dashboard role">
              {(["Admin", "Teacher", "Student"] as UserRole[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  aria-pressed={role === option}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    role === option ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={headerPanel === "notifications"}
                onClick={() => setHeaderPanel(headerPanel === "notifications" ? null : "notifications")}
                className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <Icon name="bell" className="h-[19px] w-[19px]" />
                {unreadNotifications && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />}
              </button>
              {headerPanel === "notifications" && (
                <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
                    <button type="button" onClick={() => setUnreadNotifications(false)} className="text-[11px] font-medium text-primary hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {activities.map((activity) => (
                      <div key={activity.text} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-xs leading-5 text-slate-700">{activity.text}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{activity.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="hidden h-7 border-l border-slate-200 sm:block" />
            <div className="relative">
              <button
                type="button"
                aria-label={`${userName} account`}
                aria-expanded={headerPanel === "account"}
                onClick={() => setHeaderPanel(headerPanel === "account" ? null : "account")}
                className="flex items-center gap-2"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ${role === "Student" ? "bg-violet-200 text-violet-900" : "bg-orange-200 text-orange-900"}`}>
                  {role === "Student" ? "OR" : "AM"}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11px] font-semibold text-slate-800">{userName}</span>
                  <span className="block text-[10px] text-slate-500">{role}</span>
                </span>
                <Icon name="chevron" className="hidden h-3.5 w-3.5 rotate-90 text-slate-400 sm:block" />
              </button>
              {headerPanel === "account" && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-[11px] text-slate-500">Signed in as {role}</p>
                  <button type="button" onClick={() => navigate("Settings")} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Settings</button>
                  <button type="button" onClick={() => showNotice({ title: "Sign out", message: "Sign out is not connected in this demo." })} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {databaseStatus === "offline" && (
          <div role="alert" className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:mx-7 lg:mx-9">
            Student records could not be loaded from PostgreSQL. Reconnect the database to view or save real student records.
          </div>
        )}

        <div className="flex items-center gap-1 border-b border-slate-200/70 bg-white px-4 py-2 md:hidden">
          <span className="mr-2 text-[10px] font-medium text-slate-400">Viewing as</span>
          {(["Admin", "Teacher", "Student"] as UserRole[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              aria-pressed={role === option}
              className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition ${
                role === option ? "bg-[#e7eee8] text-primary" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-7 sm:px-7 lg:px-9 lg:pt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-400">
                <span>Northstar Academy</span><Icon name="chevron" className="h-3 w-3" /><span className="text-slate-500">{activeSection}</span>
              </div>
              <h1 className="text-[25px] font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                {activeSection === "Overview" ? greeting : activeSection}
              </h1>
              <p className="mt-1.5 text-[13px] text-slate-500">{sectionDescriptions[activeSection] ?? sectionDescriptions.Overview}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
              <button
                type="button"
                aria-expanded={headerPanel === "date"}
                onClick={() => setHeaderPanel(headerPanel === "date" ? null : "date")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <Icon name="clock" className="h-4 w-4 text-slate-400" />
                <span className="hidden sm:inline">{dateRange}</span><span className="sm:hidden">{dateRange.split("–")[0].trim()}</span>
                <Icon name="chevron" className="h-3.5 w-3.5 rotate-90 text-slate-400" />
              </button>
              {headerPanel === "date" && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {["Oct 1 – Oct 31, 2025", "Sep 1 – Sep 30, 2025", "Aug 1 – Aug 31, 2025"].map((range) => (
                    <button key={range} type="button" onClick={() => { setDateRange(range); setHeaderPanel(null); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">
                      {range}
                    </button>
                  ))}
                </div>
              )}
              </div>
              <button type="button" onClick={exportStudents} disabled={databaseStatus !== "connected" || studentList.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <Icon name="download" className="h-4 w-4" /> Export
              </button>
            </div>
          </div>

          {activeSection !== "Students" && activeSection !== "Overview" && (
            <div role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {`${activeSection} is a demo preview and is not connected to PostgreSQL yet.`}
            </div>
          )}

          {activeSection === "Overview" ? (
            <>
              <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {databaseStatus === "loading"
                  ? stats.map((stat) => <StatCardSkeleton key={`${stat.label}-loading`} />)
                  : displayedStats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}
              </div>

              <div className={`mb-6 grid grid-cols-1 gap-6 ${role === "Student" ? "xl:grid-cols-[1.35fr_0.9fr]" : "xl:grid-cols-[1.5fr_0.9fr]"}`}>
                {role === "Student" ? (
                  <StudentAcademicSnapshot onNotice={showNotice} />
                ) : (
                  <StudentTable
                    query={query}
                    studentList={studentList}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    onAddStudent={() => setDialog("add-student")}
                    onImportStudents={importStudents}
                    onViewStudent={(student) => {
                      setSelectedStudent(student);
                      setDialog("student");
                    }}
                    onNotice={showNotice}
                    isDatabaseConnected={databaseStatus === "connected"}
                    isLoading={databaseStatus === "loading"}
                    onViewAll={() => navigate("Students")}
                  />
                )}
                <AttendanceChart
                  period={chartPeriod}
                  onPeriodChange={() => setChartPeriod(chartPeriod === "This week" ? "This month" : "This week")}
                  isLoading={databaseStatus === "loading"}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ScheduleCard role={role} onNotice={showNotice} />
                <ActivityCard onNotice={showNotice} />
              </div>
            </>
          ) : activeSection === "Students" ? (
            <StudentTable
              query={query}
              studentList={studentList}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onAddStudent={() => setDialog("add-student")}
              onImportStudents={importStudents}
              onViewStudent={(student) => {
                setSelectedStudent(student);
                setDialog("student");
              }}
              onNotice={showNotice}
              isDatabaseConnected={databaseStatus === "connected"}
              isLoading={databaseStatus === "loading"}
              onViewAll={() => {
                setQuery("");
                setStatusFilter("All");
              }}
            />
          ) : (
            <SectionPanel
              section={activeSection}
              onAction={() => showNotice({
                title: `${activeSection} demo`,
                message: `${sectionDescriptions[activeSection] ?? "This feature"} is currently showing sample data only. Connect a database to save changes.`,
              })}
            />
          )}

          <p className="mt-7 text-center text-[10px] text-slate-400">EduManage — Northstar Academy — Academic year 2025–2026</p>
        </div>
      </main>
      {dialog === "add-student" && (
        <Dialog title="Add a student" onClose={() => setDialog(null)}>
          <form className="flex flex-col gap-4" onSubmit={addStudent}>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              Full name
              <input name="name" required autoFocus placeholder="e.g. Jordan Lee" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              Email address
              <input name="email" type="email" required placeholder="jordan@northstar.edu" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              Class
              <select name="className" required defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent">
                <option value="" disabled>Select a class</option>
                <option>Grade 8 · Section A</option>
                <option>Grade 9 · Section B</option>
                <option>Grade 10 · Section A</option>
                <option>Grade 11 · Section A</option>
                <option>Grade 12 · Section B</option>
              </select>
            </label>
            {studentSaveError && <p role="alert" className="text-xs text-rose-700">{studentSaveError}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={studentSavePending || databaseStatus !== "connected"} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#173528] disabled:cursor-not-allowed disabled:opacity-50">{studentSavePending ? "Saving..." : "Add student"}</button>
            </div>
            <p className="text-[11px] text-slate-400">{databaseStatus === "connected" ? "Student records are saved to PostgreSQL." : "Connect PostgreSQL to save student records."}</p>
          </form>
        </Dialog>
      )}
      {dialog === "student" && selectedStudent && (
        <Dialog title="Student profile" onClose={() => setDialog(null)}>
          <div className="flex items-center gap-3">
            <span className={`flex size-12 items-center justify-center rounded-full text-sm font-semibold ${selectedStudent.avatarColor}`}>{selectedStudent.initials}</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedStudent.name}</p>
              <p className="mt-1 text-xs text-slate-500">{selectedStudent.className}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-[#f5f7f4] p-4 text-xs">
            <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-medium text-slate-800">{selectedStudent.email}</dd></div>
            <div><dt className="text-slate-500">Attendance</dt><dd className="mt-1 font-medium text-slate-800">{selectedStudent.attendance}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium text-slate-800">{selectedStudent.status}</dd></div>
          </dl>
          <p className="mt-4 text-[11px] text-slate-400">Profile details are sample data and are not connected to a database.</p>
        </Dialog>
      )}
      {notice && (
        <Dialog title={notice.title} onClose={() => setNotice(null)}>
          <p className="text-sm leading-6 text-slate-600">{notice.message}</p>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setNotice(null)} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#173528]">Got it</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
