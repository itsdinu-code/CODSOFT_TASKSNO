import Link from "next/link";

export function SiteFooter() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer className="border-t border-slate-200 px-6 py-6 text-sm text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3">
        <span>© 2026 EduManage. Internship demonstration project.</span>
        <nav className="flex flex-wrap gap-4">
          {contactEmail ? <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a> : <span>Contact details configured by the deployment owner</span>}
          <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
