import Link from "next/link";
import { AuthShell } from "../components/auth-shell";
import { LoginForm } from "../components/login-form";
export default function LoginPage() {
  return <AuthShell title="Welcome back" description="Sign in to continue managing your school." footer={<>New here? <Link className="font-semibold text-[#0a0a0a] underline" href="/register">Create an account</Link></>}>
    <LoginForm />
  </AuthShell>;
}
