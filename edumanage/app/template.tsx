"use client";

export default function Template({ children }: LayoutProps<"/">) {
  return <div className="min-h-full route-transition">{children}</div>;
}
