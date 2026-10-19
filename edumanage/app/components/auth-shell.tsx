import Link from "next/link";
import Image from "next/image";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f2f4f7] p-3 text-[#0a0a0a] sm:p-5 lg:p-8">
      <div className="dashboard-glass relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1660px] items-center justify-center overflow-hidden rounded-3xl p-4 sm:min-h-[calc(100vh-2.5rem)] sm:p-8 lg:min-h-[calc(100vh-4rem)] lg:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#e5e0ff]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-[#ffe1ca]/70 blur-3xl" />
        <section className="relative w-full max-w-md">
          <Link href="/" aria-label="EduManage home" className="mx-auto flex w-fit items-center gap-2">
            <Image src="/edumanage-logo.svg" alt="" width={36} height={36} className="size-9 rounded-2xl" priority />
            <span className="text-xl font-extrabold tracking-tight text-[#0a0a0a]">Edu<span className="text-[#e8622c]">Manage</span></span>
          </Link>
          <div className="dashboard-card mt-6 rounded-3xl p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8622c]">School workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0a0a0a]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            {children}
            <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
