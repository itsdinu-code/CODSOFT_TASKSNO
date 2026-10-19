import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ConsentAnalytics } from "./components/consent-analytics";
import { CookieConsent } from "./components/cookie-consent";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edumanage.example.com";
const siteName = "EduManage";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EduManage | School administration",
    template: "%s | EduManage",
  },
  description:
    "A clear, connected workspace for students, teachers, attendance, and academic progress.",
  applicationName: siteName,
  keywords: ["school management", "student records", "attendance", "fees", "EduManage"],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    title: "EduManage | School administration",
    description:
      "A clear, connected workspace for students, teachers, attendance, and academic progress.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduManage | School administration",
    description:
      "A clear, connected workspace for students, teachers, attendance, and academic progress.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/edumanage-logo.svg",
    apple: "/edumanage-logo.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsent />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
