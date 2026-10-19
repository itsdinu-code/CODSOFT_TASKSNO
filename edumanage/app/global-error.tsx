"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#f2f4f7] p-6 font-sans">
        <main className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8622c]">EduManage</p>
          <h1 className="mt-3 text-3xl font-bold">EduManage needs a restart</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">A serious application error interrupted this page.</p>
          <button type="button" onClick={reset} className="mt-6 rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-bold text-white">Reload application</button>
        </main>
      </body>
    </html>
  );
}
