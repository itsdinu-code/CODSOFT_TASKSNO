import Link from "next/link";
import { AuthShell } from "../components/auth-shell";
import { RegisterForm } from "../components/register-form";
export default function RegisterPage() {
  return <AuthShell title="Create your account" description="Set up your school workspace in under a minute." footer={<>Already have an account? <Link className="font-semibold text-[#0a0a0a] underline" href="/login">Sign in</Link></>}>
    <RegisterForm />
  </AuthShell>;
}
