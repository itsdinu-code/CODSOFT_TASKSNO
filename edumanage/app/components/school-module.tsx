"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "./ui-icon";
import { ConfirmDialog, RecordControls } from "./record-controls";

type ModuleName = "Attendance" | "Examinations" | "Fees" | "Academic records";
type SelectOption = { id: string; label: string; classroomId?: string | null };
type ModuleOptions = {
  students: SelectOption[];
  classrooms: SelectOption[];
  subjects: SelectOption[];
};
type RecordItem = Record<string, unknown> & { id: string };
type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "datetime-local" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  source?: keyof ModuleOptions;
  step?: string;
  min?: string;
  placeholder?: string;
};

const enumOptions: Record<string, { value: string; label: string }[]> = {
  attendanceStatus: [
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "LATE", label: "Late" },
    { value: "EXCUSED", label: "Excused" },
  ],
  examType: [
    { value: "QUIZ", label: "Quiz" },
    { value: "ASSIGNMENT", label: "Assignment" },
    { value: "MIDTERM", label: "Midterm" },
    { value: "FINAL", label: "Final" },
  ],
  paymentMethod: [
    { value: "CASH", label: "Cash" },
    { value: "BANK_TRANSFER", label: "Bank transfer" },
    { value: "CARD", label: "Card" },
    { value: "ONLINE", label: "Online" },
  ],
};

const moduleConfig: Record<ModuleName, { endpoint: string; title: string; action: string; fields: Field[] }> = {
  Attendance: {
    endpoint: "/api/attendance",
    title: "Attendance records",
    action: "Mark attendance",
    fields: [
      { name: "studentId", label: "Student", type: "select", required: true, source: "students" },
      { name: "classroomId", label: "Class", type: "select", required: true, source: "classrooms" },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", required: true, options: enumOptions.attendanceStatus },
      { name: "note", label: "Note", type: "text", placeholder: "Optional note" },
    ],
  },
  Examinations: {
    endpoint: "/api/examinations",
    title: "Examinations",
    action: "Schedule exam",
    fields: [
      { name: "title", label: "Exam title", type: "text", required: true },
      { name: "type", label: "Type", type: "select", required: true, options: enumOptions.examType },
      { name: "subjectId", label: "Subject", type: "select", required: true, source: "subjects" },
      { name: "classroomId", label: "Class", type: "select", required: true, source: "classrooms" },
      { name: "startsAt", label: "Date and time", type: "datetime-local", required: true },
      { name: "maxScore", label: "Maximum score", type: "number", required: true, step: "0.01", min: "0.01" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  Fees: {
    endpoint: "/api/fees",
    title: "Fee invoices",
    action: "Create invoice",
    fields: [
      { name: "studentId", label: "Student", type: "select", required: true, source: "students" },
      { name: "academicYear", label: "Academic year", type: "text", required: true, placeholder: "2025-2026" },
      { name: "term", label: "Term", type: "text", required: true, placeholder: "Term 1" },
      { name: "amount", label: "Amount", type: "number", required: true, step: "0.01", min: "0.01" },
      { name: "dueDate", label: "Due date", type: "date", required: true },
      { name: "description", label: "Description", type: "text", placeholder: "Optional description" },
    ],
  },
  "Academic records": {
    endpoint: "/api/academic-records",
    title: "Academic records",
    action: "Add record",
    fields: [
      { name: "studentId", label: "Student", type: "select", required: true, source: "students" },
      { name: "classroomId", label: "Class", type: "select", required: true, source: "classrooms" },
      { name: "subjectId", label: "Subject", type: "select", required: true, source: "subjects" },
      { name: "academicYear", label: "Academic year", type: "text", required: true, placeholder: "2025-2026" },
      { name: "term", label: "Term", type: "text", required: true, placeholder: "Term 1" },
      { name: "score", label: "Score", type: "number", required: true, step: "0.01", min: "0" },
      { name: "maxScore", label: "Maximum score", type: "number", required: true, step: "0.01", min: "0.01" },
      { name: "grade", label: "Grade", type: "text", placeholder: "Optional grade" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
  },
};

const emptyOptions: ModuleOptions = { students: [], classrooms: [], subjects: [] };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toInputValue(value: unknown, type: Field["type"]): string {
  const text = stringValue(value);
  if (type === "date") return text.slice(0, 10);
  if (type === "datetime-local") {
    const date = new Date(text);
    return Number.isNaN(date.getTime())
      ? ""
      : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return text;
}

function displayDate(value: unknown, includeTime = false): string {
  if (typeof value !== "string") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function person(record: unknown): string {
  const value = asRecord(record);
  return [value.firstName, value.lastName].filter((part) => typeof part === "string").join(" ") || "Unknown student";
}

function classLabel(record: unknown): string {
  const value = asRecord(record);
  return typeof value.grade === "number" && typeof value.section === "string"
    ? `Grade ${value.grade} · Section ${value.section}`
    : "No class";
}

function money(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount)
    : "—";
}

async function fetchData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  const body = asRecord(result);
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : `Request failed (${response.status}).`);
  }
  return body as T;
}

function ActionButton({
  children,
  onClick,
  tone = "neutral",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
}) {
  const color = tone === "danger"
    ? "text-rose-700 hover:bg-rose-50"
    : tone === "primary"
      ? "text-primary hover:bg-[#edf1ed]"
      : "text-slate-600 hover:bg-slate-100";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-md px-2 py-1 text-xs font-medium ${color} disabled:cursor-wait disabled:opacity-50`}>
      {children}
    </button>
  );
}

export function SchoolModule({ section }: { section: ModuleName }) {
  const config = moduleConfig[section];
  const prefersReducedMotion = useReducedMotion();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [options, setOptions] = useState<ModuleOptions>(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [success, setSuccess] = useState("");
  const [formRecord, setFormRecord] = useState<RecordItem | null | undefined>(undefined);
  const [relatedTarget, setRelatedTarget] = useState<{ record: RecordItem; item?: Record<string, unknown> } | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [confirmRecord, setConfirmRecord] = useState<RecordItem | null>(null);
  const [relatedDeleteTarget, setRelatedDeleteTarget] = useState<{ id: string; isExam: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, references] = await Promise.all([
        fetchData<{ data: RecordItem[] }>(config.endpoint),
        fetchData<{ data: { students: Record<string, unknown>[]; classrooms: Record<string, unknown>[]; subjects: Record<string, unknown>[] } }>("/api/module-options"),
      ]);
      setRecords(Array.isArray(list.data) ? list.data : []);
      const studentOptions = references.data.students
        .filter((student) => section === "Fees" || Boolean(student.classroomId))
        .map((student) => ({
        id: stringValue(student.id),
        classroomId: typeof student.classroomId === "string" ? student.classroomId : null,
        label: `${person(student)}${student.classroom ? ` · ${classLabel(student.classroom)}` : " · Unassigned"}`,
        }));
      const classrooms = references.data.classrooms.map((classroom) => ({
        id: stringValue(classroom.id),
        label: `${classLabel(classroom)} · ${stringValue(classroom.academicYear)}`,
      }));
      const subjects = references.data.subjects.map((subject) => ({
        id: stringValue(subject.id),
        label: `${stringValue(subject.name)} (${stringValue(subject.code)})`,
      }));
      setOptions({ students: studentOptions, classrooms, subjects });
      setError("");
      setLoadFailed(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load records from PostgreSQL.");
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, section]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const fields = useMemo(() => config.fields, [config.fields]);
  const filterOptions = useMemo(() => {
    const field = section === "Examinations" ? "type" : section === "Academic records" ? "term" : "status";
    return [...new Set(records.map((record) => stringValue(record[field])).filter(Boolean))]
      .sort()
      .map((value) => ({ value, label: value.replaceAll("_", " ") }));
  }, [records, section]);
  const filteredRecords = useMemo(() => {
    const field = section === "Examinations" ? "type" : section === "Academic records" ? "term" : "status";
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return records
      .filter((record) => !statusFilter || stringValue(record[field]) === statusFilter)
      .filter((record) => !normalizedQuery || JSON.stringify(record).toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => {
        if (sortOrder === "oldest") return stringValue(left.createdAt).localeCompare(stringValue(right.createdAt));
        if (sortOrder === "name") return JSON.stringify(left).localeCompare(JSON.stringify(right));
        return stringValue(right.createdAt).localeCompare(stringValue(left.createdAt));
      });
  }, [query, records, section, sortOrder, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / 20));
  const visibleRecords = filteredRecords.slice((Math.min(page, pageCount) - 1) * 20, Math.min(page, pageCount) * 20);

  async function submitMainForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    for (const field of fields) {
      const value = values[field.name];
      if (field.type === "datetime-local" && typeof value === "string" && value) {
        values[field.name] = new Date(value).toISOString();
      }
    }
    const editId = formRecord?.id;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await fetchData(editId ? `${config.endpoint}/${encodeURIComponent(editId)}` : config.endpoint, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSuccess(`${config.title.replace(/s$/, "")} ${editId ? "updated" : "saved"} to PostgreSQL.`);
      setFormRecord(undefined);
      setLoading(true);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record: RecordItem) {
    setDeletingId(record.id);
    setError("");
    setSuccess("");
    try {
      await fetchData(`${config.endpoint}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      setSuccess("Record deleted from PostgreSQL.");
      setConfirmRecord(null);
      setLoading(true);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this record.");
    } finally {
      setDeletingId("");
    }
  }

  async function submitRelatedForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!relatedTarget) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const isExam = section === "Examinations";
    const existingId = relatedTarget.item?.id;
    const endpoint = isExam
      ? existingId
        ? `/api/exam-results/${encodeURIComponent(stringValue(existingId))}`
        : `/api/examinations/${encodeURIComponent(relatedTarget.record.id)}/results`
      : existingId
        ? `/api/fee-payments/${encodeURIComponent(stringValue(existingId))}`
        : `/api/fees/${encodeURIComponent(relatedTarget.record.id)}/payments`;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await fetchData(endpoint, {
        method: existingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSuccess(isExam ? "Examination result saved to PostgreSQL." : "Fee payment saved to PostgreSQL.");
      setRelatedTarget(null);
      setLoading(true);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this related record.");
    } finally {
      setSaving(false);
    }
  }

  async function submitSubjectForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await fetchData("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSuccess("Subject saved to PostgreSQL.");
      setShowSubjectForm(false);
      setLoading(true);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this subject.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelated(itemId: string, isExam: boolean) {
    const endpoint = isExam ? "/api/exam-results" : "/api/fee-payments";
    setDeletingId(itemId);
    setError("");
    setSuccess("");
    try {
      await fetchData(`${endpoint}/${encodeURIComponent(itemId)}`, { method: "DELETE" });
      setRelatedDeleteTarget(null);
      setSuccess(`${isExam ? "Examination result" : "Fee payment"} deleted from PostgreSQL.`);
      setLoading(true);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this record.");
    } finally {
      setDeletingId("");
    }
  }

  function valueFor(record: RecordItem | undefined, field: Field): string {
    if (!record) {
      if (field.name === "date") return new Date().toISOString().slice(0, 10);
      if (field.name === "startsAt") return toInputValue(new Date().toISOString(), "datetime-local");
      return "";
    }
    const raw = record[field.name];
    if (field.name === "studentId" && raw === undefined) return stringValue(asRecord(record.student).id);
    if (field.name === "classroomId" && raw === undefined) return stringValue(asRecord(record.classroom).id);
    if (field.name === "subjectId" && raw === undefined) return stringValue(asRecord(record.subject).id);
    return toInputValue(raw, field.type);
  }

  function renderField(field: Field, value: string, keyPrefix = "") {
    const baseClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary";
    const list = field.source ? options[field.source].map((option) => ({ value: option.id, label: option.label })) : field.options ?? [];
    return (
      <label key={`${keyPrefix}${field.name}`} className={`block text-xs font-medium text-slate-700 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
        {field.label}
        {field.type === "select" ? (
          <>
            <select name={field.name} required={field.required} defaultValue={value} className={baseClass}>
              <option value="">Select {field.label.toLowerCase()}</option>
              {list.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {field.source && list.length === 0 && (
              <span className="mt-1 block font-normal text-amber-700">
                {field.source === "subjects"
                  ? "No subjects yet. Add a subject below."
                  : field.source === "classrooms"
                    ? "No classes yet. Add a student and assign a class first."
                    : "No students yet. Add a student from the Students section."}
              </span>
            )}
          </>
        ) : field.type === "textarea" ? (
          <textarea name={field.name} defaultValue={value} rows={2} className={baseClass} />
        ) : (
          <input
            name={field.name}
            type={field.type}
            required={field.required}
            min={field.min}
            step={field.step}
            placeholder={field.placeholder}
            defaultValue={value}
            className={baseClass}
          />
        )}
      </label>
    );
  }

  function renderMainForm() {
    if (formRecord === undefined) return null;
    return (
      <form onSubmit={submitMainForm} className="border-b border-[#e8eee8] bg-[#fafbf9] px-6 py-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">{formRecord ? `Edit ${config.title.replace(/s$/, "")}` : config.action}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => renderField(field, valueFor(formRecord ?? undefined, field)))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setFormRecord(undefined)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-white">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-[#173528] disabled:opacity-50">{saving ? "Saving…" : "Save to PostgreSQL"}</button>
        </div>
      </form>
    );
  }

  function renderRelatedForm() {
    if (!relatedTarget) return null;
    const isExam = section === "Examinations";
    const item = relatedTarget.item;
    const relatedFields: Field[] = isExam
      ? [
          ...(item ? [] : [{
            name: "studentId",
            label: "Student",
            type: "select" as const,
            required: true,
            options: options.students
              .filter((student) => student.classroomId === stringValue(asRecord(relatedTarget.record.classroom).id))
              .map((student) => ({ value: student.id, label: student.label })),
          }]),
          { name: "score", label: "Score", type: "number", required: true, step: "0.01", min: "0" },
          { name: "grade", label: "Grade", type: "text", placeholder: "Optional grade" },
          { name: "remarks", label: "Remarks", type: "text", placeholder: "Optional remarks" },
        ]
      : [
          { name: "amount", label: "Payment amount", type: "number", required: true, step: "0.01", min: "0.01" },
          { name: "method", label: "Method", type: "select", required: true, options: enumOptions.paymentMethod },
          { name: "note", label: "Note", type: "text", placeholder: "Optional note" },
        ];
    return (
      <form onSubmit={submitRelatedForm} className="border-b border-[#e8eee8] bg-[#fafbf9] px-6 py-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">
          {item ? "Edit" : "Add"} {isExam ? "exam result" : "fee payment"} · {isExam ? stringValue(relatedTarget.record.title) : stringValue(relatedTarget.record.invoiceNumber)}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {relatedFields.map((field) => renderField(field, toInputValue(item?.[field.name], field.type), "related-"))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setRelatedTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-white">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-[#173528] disabled:opacity-50">{saving ? "Saving…" : "Save to PostgreSQL"}</button>
        </div>
      </form>
    );
  }

  function renderPrimary(record: RecordItem): ReactNode {
    if (section === "Attendance") {
      return <><span className="font-medium text-slate-800">{person(record.student)}</span><span className="block text-xs text-slate-500">{classLabel(record.classroom)} · {displayDate(record.date)}</span></>;
    }
    if (section === "Examinations") {
      return <><span className="font-medium text-slate-800">{stringValue(record.title)}</span><span className="block text-xs text-slate-500">{stringValue(asRecord(record.subject).name)} · {classLabel(record.classroom)}</span></>;
    }
    if (section === "Fees") {
      return <><span className="font-medium text-slate-800">{stringValue(record.invoiceNumber)} · {person(record.student)}</span><span className="block text-xs text-slate-500">{stringValue(record.description) || `${stringValue(record.academicYear)} · ${stringValue(record.term)}`}</span></>;
    }
    return <><span className="font-medium text-slate-800">{person(record.student)} · {stringValue(asRecord(record.subject).name)}</span><span className="block text-xs text-slate-500">{classLabel(record.classroom)} · {stringValue(record.academicYear)} · {stringValue(record.term)}</span></>;
  }

  function renderDetail(record: RecordItem): ReactNode {
    if (section === "Attendance") {
      const status = stringValue(record.status).toLowerCase().replaceAll("_", " ");
      return <span className="status-badge status-neutral capitalize">{status}</span>;
    }
    if (section === "Examinations") {
      const results = Array.isArray(record.results) ? record.results : [];
      const avg = results.length
        ? Math.round(results.reduce((total, result) => total + Number(asRecord(result).score), 0) / results.length * 100) / 100
        : null;
      return <span className="text-xs text-slate-600">{displayDate(record.startsAt, true)} · {results.length} result{results.length === 1 ? "" : "s"}{avg === null ? "" : ` · avg ${avg}`}</span>;
    }
    if (section === "Fees") {
      const payments = Array.isArray(record.payments) ? record.payments : [];
      const paid = payments.reduce((total, payment) => total + Number(asRecord(payment).amount), 0);
      return <span className="text-xs text-slate-600">{money(paid)} paid · {money(Math.max(0, Number(record.amount) - paid))} due · {stringValue(record.status).replaceAll("_", " ")}</span>;
    }
    return <span className="text-xs text-slate-600">{stringValue(record.grade) || `${stringValue(record.score)} / ${stringValue(record.maxScore)}`}{record.grade ? ` · ${stringValue(record.score)} / ${stringValue(record.maxScore)}` : ""}</span>;
  }

  function renderNested(record: RecordItem): ReactNode {
    if (section === "Examinations") {
      const results = Array.isArray(record.results) ? record.results.map(asRecord) : [];
      if (!results.length) return null;
      return (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student results</p>
          <div className="space-y-1.5">
            {results.map((result) => (
              <div key={stringValue(result.id)} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="min-w-32 flex-1">{person(result.student)}</span>
                <span>{stringValue(result.score)} / {stringValue(record.maxScore)} {result.grade ? `· ${stringValue(result.grade)}` : ""}</span>
                <ActionButton onClick={() => setRelatedTarget({ record, item: result })}>Edit</ActionButton>
                <ActionButton tone="danger" disabled={deletingId === stringValue(result.id)} onClick={() => setRelatedDeleteTarget({ id: stringValue(result.id), isExam: true })}>Delete</ActionButton>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (section === "Fees") {
      const payments = Array.isArray(record.payments) ? record.payments.map(asRecord) : [];
      if (!payments.length) return null;
      return (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payments</p>
          <div className="space-y-1.5">
            {payments.map((payment) => (
              <div key={stringValue(payment.id)} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="min-w-32 flex-1">{money(payment.amount)} · {stringValue(payment.method).replaceAll("_", " ")} · {displayDate(payment.paidAt)}</span>
                <ActionButton onClick={() => setRelatedTarget({ record, item: payment })}>Edit</ActionButton>
                <ActionButton tone="danger" disabled={deletingId === stringValue(payment.id)} onClick={() => setRelatedDeleteTarget({ id: stringValue(payment.id), isExam: false })}>Delete</ActionButton>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8eee8] px-4 py-5 sm:px-6 sm:py-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
          <p className="mt-1 text-xs text-slate-500">Records loaded from PostgreSQL.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(section === "Examinations" || section === "Academic records") && (
            <button type="button" onClick={() => { setError(""); setSuccess(""); setShowSubjectForm((visible) => !visible); }} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Add subject
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setRelatedTarget(null);
              setFormRecord(null);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#262626]"
          >
            <Icon name="plus" className="h-4 w-4" />{config.action}
          </button>
        </div>
      </div>
      {showSubjectForm && (
        <form onSubmit={submitSubjectForm} className="border-b border-[#e8eee8] bg-[#fafbf9] px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Add a subject</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-700">Subject name<input name="name" required maxLength={120} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
            <label className="text-xs font-medium text-slate-700">Subject code<input name="code" required maxLength={30} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-primary" /></label>
            <label className="text-xs font-medium text-slate-700">Description<input name="description" maxLength={500} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowSubjectForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-white">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-[#173528] disabled:opacity-50">{saving ? "Saving…" : "Save subject"}</button>
          </div>
        </form>
      )}
      {renderMainForm()}
      {renderRelatedForm()}
      {success && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-xs text-emerald-800">{success}</p>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-6 py-3 text-xs text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="font-semibold underline">Retry</button>
        </div>
      )}
      {!loading && !loadFailed && records.length > 0 && (
        <RecordControls
          query={query}
          onQueryChange={(value) => { setQuery(value); setPage(1); }}
          filter={statusFilter}
          onFilterChange={(value) => { setStatusFilter(value); setPage(1); }}
          filterLabel={section === "Examinations" ? "All exam types" : section === "Academic records" ? "All terms" : "All statuses"}
          filterOptions={filterOptions}
          sort={sortOrder}
          onSortChange={(value) => { setSortOrder(value); setPage(1); }}
          sortOptions={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "name", label: "Name A–Z" },
          ]}
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          total={filteredRecords.length}
          onPageChange={setPage}
        />
      )}
      {loading ? (
        <div role="status" className="flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <span className="skeleton size-5 rounded-full" />Loading records from PostgreSQL…
        </div>
      ) : loadFailed && records.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-foreground">Records could not be loaded</p>
          <p className="mt-1 text-xs text-slate-500">Use Retry above to reconnect to PostgreSQL.</p>
        </div>
      ) : records.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-foreground">No {config.title.toLowerCase()} yet</p>
          <p className="mt-1 text-xs text-slate-500">Create a record to see real PostgreSQL data here.</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-foreground">No matching records</p>
          <p className="mt-1 text-xs text-slate-500">Try changing your search or filter.</p>
          <button type="button" onClick={() => { setQuery(""); setStatusFilter(""); }} className="mt-3 min-h-10 rounded-xl px-4 text-xs font-semibold text-slate-800 hover:bg-slate-100">Clear filters</button>
        </div>
      ) : (
        <div className="divide-y divide-[#edf1ed]">
          {visibleRecords.map((record, index) => {
            const content = (
              <>
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-48 flex-1 text-sm">{renderPrimary(record)}</div>
                <div className="min-w-48">{renderDetail(record)}</div>
                <div className="flex shrink-0 items-center gap-1">
                  {(section === "Examinations" || section === "Fees") && (
                    <ActionButton tone="primary" onClick={() => setRelatedTarget({ record })}>{section === "Examinations" ? "Add result" : "Add payment"}</ActionButton>
                  )}
                  <ActionButton onClick={() => { setError(""); setSuccess(""); setRelatedTarget(null); setFormRecord(record); }}>Edit</ActionButton>
                  <ActionButton tone="danger" disabled={deletingId === record.id} onClick={() => setConfirmRecord(record)}>Delete</ActionButton>
                </div>
              </div>
              {renderNested(record)}
              </>
            );
            return index < 12 ? (
              <motion.article
                key={record.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.22,
                  delay: prefersReducedMotion ? 0 : index * 0.014,
                  ease: "easeOut",
                }}
                className="px-6 py-4"
              >
                {content}
              </motion.article>
            ) : (
              <article key={record.id} className="px-6 py-4">{content}</article>
            );
          })}
        </div>
      )}
      <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
        {loading ? "Loading database records…" : `${filteredRecords.length} matching database record${filteredRecords.length === 1 ? "" : "s"}.`}
        {records.length === 500 ? " The list is limited to the most recent 500 records." : ""}
      </div>
      {confirmRecord && (
        <ConfirmDialog
          title={`Delete ${config.title.replace(/s$/, "").toLowerCase()}?`}
          description={`This permanently deletes the selected database record.${section === "Examinations" ? " Its recorded student results will also be deleted." : section === "Fees" ? " Its recorded payments will also be deleted." : ""}`}
          busy={deletingId === confirmRecord.id}
          onCancel={() => setConfirmRecord(null)}
          onConfirm={() => void deleteRecord(confirmRecord)}
        />
      )}
      {relatedDeleteTarget && (
        <ConfirmDialog
          title={`Delete this ${relatedDeleteTarget.isExam ? "examination result" : "fee payment"}?`}
          description="This permanently deletes the selected database record. This action cannot be undone."
          busy={deletingId === relatedDeleteTarget.id}
          onCancel={() => setRelatedDeleteTarget(null)}
          onConfirm={() => void deleteRelated(relatedDeleteTarget.id, relatedDeleteTarget.isExam)}
        />
      )}
    </section>
  );
}
