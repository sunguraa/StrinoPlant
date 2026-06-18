import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Branding } from "@/components/layout/branding";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('strinoplant-theme');if(!t)t='dark';document.documentElement.className=t;}catch(e){document.documentElement.className='dark';}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans h-screen overflow-hidden flex flex-col antialiased`}
      >
        {children}
        <Branding />
      </body>
    </html>
  );
}
