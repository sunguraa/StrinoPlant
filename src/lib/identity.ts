/**
 * Shared cross-app user identity. Because both StrinoBans and StrinoPlant are
 * served from sunguraa.github.io, they can read and write the same localStorage
 * key.
 */

import { isNameClean } from "./filters";

export const USER_IDENTITY_KEY = "strino_user_identity";

export interface UserIdentity {
  name: string;
  color: string;
}

export function randomColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const DEFAULT_NAMES = [
  "Strinova",
  "Pulsar",
  "Vector",
  "Echo",
  "Cinder",
  "Frost",
  "Surge",
  "Wisp",
  "Onyx",
  "Aurora",
];

function defaultIdentity(): UserIdentity {
  const name = `${DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)]} ${Math.floor(Math.random() * 1000)}`;
  return { name, color: randomColor() };
}

export function getUserIdentity(): UserIdentity {
  if (typeof window === "undefined") return defaultIdentity();
  try {
    const raw = window.localStorage.getItem(USER_IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserIdentity;
      if (parsed.name?.trim() && parsed.color) return parsed;
    }
  } catch {
    // ignore
  }
  const identity = defaultIdentity();
  try {
    window.localStorage.setItem(USER_IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // ignore storage errors
  }
  return identity;
}

export function setUserIdentity(identity: UserIdentity): void {
  if (typeof window === "undefined") return;
  const cleanName = identity.name.trim();
  const validated = {
    ...identity,
    name: isNameClean(cleanName) ? cleanName : getUserIdentity().name,
  };
  try {
    window.localStorage.setItem(USER_IDENTITY_KEY, JSON.stringify(validated));
  } catch {
    // ignore storage errors
  }
}
