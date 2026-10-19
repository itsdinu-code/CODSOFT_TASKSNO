import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address").max(254).transform((v) => v.toLowerCase());
const password = z.string().min(12, "Password must be at least 12 characters").max(128)
  .refine((v) => /[a-z]/.test(v), "Password must include a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Password must include an uppercase letter")
  .refine((v) => /\d/.test(v), "Password must include a number")
  .refine((v) => /[^a-zA-Z0-9]/.test(v), "Password must include a symbol");
const token = z.string().max(4096).optional();

export const loginSchema = z.object({ email, password: z.string().min(1).max(128), turnstileToken: token });
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120).regex(/^[A-Za-z][A-Za-z .'-]*$/, "Name may only contain letters, spaces, and . ' -"),
  email, password, confirmPassword: z.string().min(1).max(128), turnstileToken: token,
}).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
