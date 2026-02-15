import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import FloatingChat from "@/components/FloatingChat";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulsed — Your AI Agent",
  description:
    "One AI agent that researches, builds, and automates anything you describe. Powered by your own model. Controlled entirely by you.",
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
        <FloatingChat />
        <Analytics />
      </body>
    </html>
  );
}
