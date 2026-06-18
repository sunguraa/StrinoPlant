"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header
      className="flex h-14 items-center justify-between border-b border-border px-6"
      role="banner"
    >
      <Link
        href="/"
        className="font-serif text-xl font-medium italic tracking-tight"
        aria-label="StrinoPlant home"
      >
        StrinoPlant
      </Link>

      <nav className="flex items-center gap-6" aria-label="Main">
        <a
          href="https://sunguraa.github.io/StrinoBans/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          StrinoBans
        </a>
        <a
          href="https://strinova.org/wiki/Main_Page"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Wiki
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
