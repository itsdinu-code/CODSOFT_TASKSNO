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
