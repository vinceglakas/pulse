import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsed — AI Market Intelligence",
  description:
    "Research any topic in 30 seconds. AI-powered intelligence briefs with key themes, sentiment analysis, and actionable insights.",
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
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-white text-gray-900 font-sans`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
