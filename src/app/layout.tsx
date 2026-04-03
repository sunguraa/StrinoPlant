import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Branding } from "@/components/layout/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StrinoPlant",
  description: "Local-first Strinova strategy planner for maps, setups, and live collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body suppressHydrationWarning className="h-full overflow-hidden flex flex-col">
        {children}
        <Branding />
      </body>
    </html>
  );
}
