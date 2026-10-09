import { Suspense } from "react";
import { AdminDashboard } from "../../components/admin-dashboard";

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
  const { section } = await params;
  return <AdminDashboard initialSection={parseSection(section)} />;
}
