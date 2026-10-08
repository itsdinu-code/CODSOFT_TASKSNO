export type IconName =
  | "overview"
  | "students"
  | "teachers"
  | "attendance"
  | "exams"
  | "fees"
  | "records"
  | "settings"
  | "search"
  | "bell"
  | "chevron"
  | "trend"
  | "menu"
  | "close"
  | "plus"
  | "clock"
  | "book"
  | "arrow"
  | "dots"
  | "filter"
  | "download"
  | "check";

const iconPaths: Record<IconName, string[]> = {
  overview: ["M3 3h8v8H3z", "M13 3h8v5h-8z", "M13 10h8v11h-8z", "M3 13h8v8H3z"],
  students: ["M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M20 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  teachers: ["M12 3 2 8l10 5 10-5-10-5Z", "m6 10 6 3 6-3", "M4 9v6c0 2 3.58 4 8 4s8-2 8-4V9", "M22 8v6"],
  attendance: ["M9 11l2 2 4-4", "M8 3h8", "M8 3v3", "M16 3v3", "M4 7h16v14H4z"],
  exams: ["M8 4h12v17H8z", "M4 8H3v13h12v-1", "M11 8h6", "M11 12h6", "M11 16h4"],
  fees: ["M3 6h18v14H3z", "M3 10h18", "M7 15h4", "M17 3H5a2 2 0 0 0-2 2"],
  records: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M8 8h8", "M8 12h8", "M8 16h5"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.09-.02a1.7 1.7 0 0 0-1.72.44l-.07.07h-3.4l-.02-.1a1.7 1.7 0 0 0-1.3-1.3l-.1-.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 10.1 14l-.1-.05v-3.4l.1-.02a1.7 1.7 0 0 0 1.3-1.3l.02-.1 2.94-1.7.06.06a1.7 1.7 0 0 0 1.88.34l.06-.06 2.94 1.7-.02.09a1.7 1.7 0 0 0 .44 1.72l.07.07v3.4l-.1.02a1.7 1.7 0 0 0-1.3 1.3Z"],
  search: ["m20 20-4.5-4.5", "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  chevron: ["m9 18 6-6-6-6"],
  trend: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  plus: ["M12 5v14", "M5 12h14"],
  clock: ["M12 8v4l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  book: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z", "M4 5.5v16", "M8 7h8", "M8 11h7"],
  arrow: ["M5 12h14", "m12 5 7 7-7 7"],
  dots: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  filter: ["M4 7h16", "M7 12h10", "M10 17h4"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  check: ["m5 12 4 4L19 6"],
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name].map((path, index) => (
        <path d={path} key={`${path}-${index}`} />
      ))}
    </svg>
  );
}
