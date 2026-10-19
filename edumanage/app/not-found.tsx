import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f4f7] p-6">
      <section className="dashboard-card w-full max-w-lg rounded-3xl p-8 text-center">
        <p className="text-7xl font-black text-[#0a0a0a]">404</p>
        <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500">The page you requested does not exist or has moved.</p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-bold text-white">Return home</Link>
      </section>
    </main>
  );
}
