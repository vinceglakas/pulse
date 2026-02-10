import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsed — AI Trend Intelligence",
  description:
    "AI-powered trend briefs from Reddit, HN, YouTube, and the web. Know what people are actually saying — in 2 minutes.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-[#0A0A0B] text-[#F5F5F7] font-sans`}
      >
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-transparent">
          <Link href="/" className="text-xl font-bold gradient-text tracking-tight">
            Pulsed
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[#8E8E93] hover:text-[#F5F5F7] transition-colors duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:opacity-90 transition-opacity duration-200"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <main>{children}</main>
      </body>
    </html>
  );
}
