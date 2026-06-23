"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getUserIdentity, setUserIdentity, type UserIdentity } from "@/lib/identity";
import { isNameClean, NAME_FILTER_ERROR } from "@/lib/filters";
import { randomColor } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{6})$/.test(value.trim());
}

function useLocalIdentity() {
  const [identity, setLocalIdentity] = useState<UserIdentity | null>(null);

  useEffect(() => {
    // Hydration-safe: read the stored identity once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalIdentity(getUserIdentity());
  }, []);

  const resolvedIdentity: UserIdentity = identity ?? { name: "You", color: "#45B7D1" };

  const updateIdentity = (patch: Partial<UserIdentity>) => {
    const next = { ...resolvedIdentity, ...patch };
    if (next.name && !isNameClean(next.name)) return;
    setLocalIdentity(next);
    setUserIdentity(next);
  };

  return { identity: resolvedIdentity, updateIdentity };
}

export function Header() {
  const { identity, updateIdentity } = useLocalIdentity();
  const [identityOpen, setIdentityOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Start the hex input draft from the current identity color.
  const [colorDraft, setColorDraft] = useState(identity.color);

  // Collapse the identity menu when clicking outside of it.
  useEffect(() => {
    if (!identityOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIdentityOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [identityOpen]);

  const nameInvalid = !isNameClean(identity.name);

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setColorDraft(identity.color);
              setIdentityOpen((v) => !v);
            }}
            className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm transition-colors hover:bg-card"
            aria-label="Edit your identity"
            aria-expanded={identityOpen}
          >
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: identity.color }}
              aria-hidden="true"
            />
            <span className="max-w-[120px] truncate">{identity.name}</span>
          </button>
          {identityOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
              <label className="block text-xs font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={identity.name}
                onChange={(e) => updateIdentity({ name: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                maxLength={24}
              />
              {nameInvalid && (
                <p className="mt-1 text-xs text-destructive" role="alert">{NAME_FILTER_ERROR}</p>
              )}
              <label className="mt-2 block text-xs font-medium text-muted-foreground">Colour (hex)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={colorDraft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setColorDraft(value);
                    if (isValidHexColor(value)) {
                      updateIdentity({ color: value });
                    }
                  }}
                  onBlur={() => {
                    if (!isValidHexColor(colorDraft)) {
                      setColorDraft(identity.color);
                    }
                  }}
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                  maxLength={7}
                  placeholder="#45B7D1"
                />
                <button
                  type="button"
                  onClick={() => updateIdentity({ color: randomColor() })}
                  className="shrink-0 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                  aria-label="Random colour"
                >
                  🎲
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
