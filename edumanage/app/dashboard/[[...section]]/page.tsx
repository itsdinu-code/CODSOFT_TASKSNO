import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { AdminDashboard } from "../../components/admin-dashboard";
import { readSession } from "../../lib/auth";

const supportedSections = [
  "overview",
  "students",
  "teachers",
  "attendance",
  "examinations",
  "fees",
  "academic-records",
  "calendar",
] as const;

type Section = (typeof supportedSections)[number];

function parseSection(value: string[] | undefined): Section {
  const section = value?.[0];
  return supportedSections.find((item) => item === section) ?? "overview";
}

export default function DashboardPage({
  params,
}: PageProps<"/dashboard/[[...section]]">) {
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-[linear-gradient(135deg,#eaf2ff_0%,#f0edff_46%,#fff0e5_100%)]" />}>
      <DashboardContent params={params} />
    </Suspense>
  );
}

async function DashboardContent({
  params,
}: { params: PageProps<"/dashboard/[[...section]]">["params"] }) {
  // Server-side gate: APIs each re-verify, but the page itself must not
  // render student PII to an unauthenticated visitor.
  // `connection()` opts this subtree out of static caching under
  // `cacheComponents` (where legacy `export const dynamic` is rejected).
  await connection();
  const store = await cookies();
  if (!readSession(store.get("edumanage-session")?.value)) {
    redirect("/login");
  }
  const { section } = await params;
  return <AdminDashboard initialSection={parseSection(section)} />;
}
