export type UserRole = "Admin" | "Teacher" | "Student";

export type StudentStatus = "Active" | "On leave" | "Pending" | "Inactive" | "Graduated";

export type Student = {
  id?: string;
  name: string;
  initials: string;
  className: string;
  email: string;
  attendance: string;
  status: StudentStatus;
  avatarColor: string;
};

export const students: Student[] = [
  {
    name: "Olivia Rhye",
    initials: "OR",
    className: "Grade 10 · Section A",
    email: "olivia.rhye@northstar.edu",
    attendance: "98%",
    status: "Active",
    avatarColor: "bg-violet-100 text-violet-700",
  },
  {
    name: "Phoenix Baker",
    initials: "PB",
    className: "Grade 9 · Section B",
    email: "phoenix.baker@northstar.edu",
    attendance: "92%",
    status: "Active",
    avatarColor: "bg-sky-100 text-sky-700",
  },
  {
    name: "Lana Steiner",
    initials: "LS",
    className: "Grade 11 · Section A",
    email: "lana.steiner@northstar.edu",
    attendance: "96%",
    status: "On leave",
    avatarColor: "bg-rose-100 text-rose-700",
  },
  {
    name: "Demi Wilkinson",
    initials: "DW",
    className: "Grade 8 · Section C",
    email: "demi.wilkinson@northstar.edu",
    attendance: "88%",
    status: "Active",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  {
    name: "Candice Wu",
    initials: "CW",
    className: "Grade 12 · Section B",
    email: "candice.wu@northstar.edu",
    attendance: "94%",
    status: "Pending",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Natali Craig",
    initials: "NC",
    className: "Grade 10 · Section C",
    email: "natali.craig@northstar.edu",
    attendance: "97%",
    status: "Active",
    avatarColor: "bg-pink-100 text-pink-700",
  },
];

export const schedule = [
  { time: "09:00 AM", subject: "Mathematics", detail: "Grade 10 · Room 204", color: "bg-indigo-500" },
  { time: "10:30 AM", subject: "Science", detail: "Grade 9 · Lab 02", color: "bg-emerald-500" },
  { time: "01:15 PM", subject: "English Literature", detail: "Grade 11 · Room 108", color: "bg-amber-500" },
];

export const activities = [
  { initials: "SC", color: "bg-sky-100 text-sky-700", text: "Sophie Chen submitted her assignment", time: "10 min ago" },
  { initials: "MR", color: "bg-violet-100 text-violet-700", text: "Marcus Reed paid the term fee", time: "42 min ago" },
  { initials: "AT", color: "bg-emerald-100 text-emerald-700", text: "Attendance marked for Grade 10A", time: "1 hour ago" },
];
