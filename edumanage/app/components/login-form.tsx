"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "../lib/auth-validation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  async function submit(values: LoginInput) {
    setError("");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(values), signal: controller.signal });
      window.clearTimeout(timeout);
      if (response.ok) { router.push("/dashboard"); router.refresh(); return; }
      const body = await response.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Sign-in failed. Please try again.");
    } catch (submitError) { setError(submitError instanceof DOMException && submitError.name === "AbortError" ? "The database is taking too long to respond. Check PostgreSQL and try again." : "Unable to reach the server. Check your connection and try again."); }
  }
  return <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-4" noValidate>
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">Email<input className="mt-2 block min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#e8622c] focus:bg-white focus:ring-4 focus:ring-[#e8622c]/10" type="email" autoComplete="email" {...register("email")} />{errors.email && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.email.message}</span>}</label>
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">Password<input className="mt-2 block min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#e8622c] focus:bg-white focus:ring-4 focus:ring-[#e8622c]/10" type="password" autoComplete="current-password" {...register("password")} />{errors.password && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.password.message}</span>}</label>
    {error && <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm leading-5 text-rose-700">{error}</p>}
    <button disabled={isSubmitting} className="min-h-12 w-full rounded-2xl bg-[#0a0a0a] px-6 text-sm font-bold text-white transition hover:bg-[#e8622c] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Checking workspace…" : "Sign in to your dashboard"}</button>
  </form>;
}
