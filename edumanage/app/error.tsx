"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f4f7] p-6">
      <section className="dashboard-card w-full max-w-lg rounded-3xl p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8622c]">EduManage</p>
        <h1 className="mt-3 text-3xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">The page could not finish loading. You can try again or return to the dashboard.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-bold text-white hover:bg-[#e8622c]">Try again</button>
          <Link href="/" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold">Go home</Link>
        </div>
      </section>
    </main>
  );
}
