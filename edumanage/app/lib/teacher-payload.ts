import { z } from "zod";

const schema = z.object({
  employeeNumber: z.string().trim().min(1).max(40),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).nullable().optional(),
  designation: z.string().trim().max(120).nullable().optional(),
  hireDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]).optional(),
});

export function teacherPayload(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid teacher details." };
  return { data: parsed.data };
}
