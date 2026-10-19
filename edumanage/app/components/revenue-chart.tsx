"use client";
export function RevenueChart({ data = [] }: { data?: { month: string; invoiced: number; collected: number }[] }) {
  return <div className="h-57.5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{data.length ? `${data.length} months of revenue` : "No revenue data yet"}</div>;
}
