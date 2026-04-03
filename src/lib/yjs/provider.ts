"use client";

import { toAbsoluteUrl } from "@/lib/base-path";
import { getSetupEditorHref } from "@/lib/routes";


/**
 * Yjs document and transport provider factory for P2P collaboration.
 *
 * - One Y.Doc per setup (room)
 * - Trystero is the default transport
 * - y-webrtc remains available as an explicit legacy fallback
 * - Room name derived from setup ID
 * - Awareness protocol for cursors/presence
 */

import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { createTrysteroTransportProvider } from "./trystero-provider";
import { createWebrtcTransportProvider } from "./webrtc-provider";

/** Collaborative user info shared via awareness. */
export interface CollabUser {
  name: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  selection?: string[]; // selected object IDs
}

export type CollabTransport = "trystero" | "webrtc";

export interface CollabInitialSyncState {
  shouldSeedLocal: boolean;
  discoveredPeerCount: number;
  didReceiveRemoteDoc: boolean;
}

export interface CollabProvider {
  readonly transport: CollabTransport;
  readonly awareness: Awareness;
  destroy(): void;
  waitForInitialSync(): Promise<CollabInitialSyncState>;
}

/** Active collaboration session state. */
export interface CollabState {
  doc: Y.Doc;
  provider: CollabProvider;
  awareness: Awareness;
  transport: CollabTransport;
}

interface DestroyCollabSessionOptions {
  immediate?: boolean;
}

interface CollabSessionEntry {
  roomName: string;
  doc: Y.Doc;
  provider: CollabProvider;
  awareness: Awareness;
  refCount: number;
  destroyTimer: ReturnType<typeof setTimeout> | null;
  isDestroyed: boolean;
}

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

const ANIMAL_NAMES = [
  "Fox",
  "Owl",
  "Wolf",
  "Bear",
  "Hawk",
  "Deer",
  "Lynx",
  "Raven",
  "Otter",
  "Eagle",
  "Falcon",
  "Panda",
  "Tiger",
  "Crane",
  "Shark",
];

const SESSION_DESTROY_GRACE_PERIOD_MS = 250;

const sessionRegistry = new Map<string, CollabSessionEntry>();
const sessionHandles = new WeakMap<CollabState, CollabSessionEntry>();
const releasedHandles = new WeakSet<CollabState>();

const LEGACY_COLLAB_TOKEN = "1";

function getConfiguredTransport(): CollabTransport {
  const configured = process.env.NEXT_PUBLIC_COLLAB_TRANSPORT?.trim().toLowerCase();

  return configured === "webrtc" ? "webrtc" : "trystero";
}

function createTransportProvider(roomName: string, doc: Y.Doc): CollabProvider {
  return getConfiguredTransport() === "trystero"
    ? createTrysteroTransportProvider(roomName, doc)
    : createWebrtcTransportProvider(roomName, doc);
}

function createSessionHandle(entry: CollabSessionEntry): CollabState {
  const state: CollabState = {
    doc: entry.doc,
    provider: entry.provider,
    awareness: entry.awareness,
    transport: entry.provider.transport,
  };

  sessionHandles.set(state, entry);

  return state;
}

function finalizeSessionEntry(entry: CollabSessionEntry): void {
  if (entry.destroyTimer) {
    clearTimeout(entry.destroyTimer);
    entry.destroyTimer = null;
  }

  if (entry.refCount > 0 || entry.isDestroyed) return;

  entry.isDestroyed = true;

  try {
    entry.provider.destroy();
  } catch {
    // Provider destruction is intentionally best-effort and idempotent.
  }

  try {
    entry.doc.destroy();
  } catch {
    // Y.Doc destruction is intentionally best-effort and idempotent.
  }

  if (sessionRegistry.get(entry.roomName) === entry) {
    sessionRegistry.delete(entry.roomName);
  }
}

function scheduleSessionDestroy(entry: CollabSessionEntry): void {
  if (entry.destroyTimer || entry.isDestroyed) return;

  entry.destroyTimer = setTimeout(() => {
    entry.destroyTimer = null;
    finalizeSessionEntry(entry);
  }, SESSION_DESTROY_GRACE_PERIOD_MS);
}

function randomUserName(): string {
  return ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
}

function randomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function normalizeCollabToken(token?: string | null): string {
  const trimmed = token?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : LEGACY_COLLAB_TOKEN;
}

function getCollabRoomName(setupId: string, collabToken?: string | null): string {
  const normalizedToken = normalizeCollabToken(collabToken);

  if (normalizedToken === LEGACY_COLLAB_TOKEN) {
    return `strinoplant:${setupId}`;
  }

  return `strinoplant:${setupId}:${encodeURIComponent(normalizedToken)}`;
}

/**
 * Get or generate a persistent anonymous user identity (stored in localStorage).
 */
function getUserIdentity(): { name: string; color: string } {
  const key = "strinoplant_user_identity";
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as { name?: string; color?: string };
      if (parsed.name && parsed.color) return parsed as { name: string; color: string };
    }
  } catch {
    // Ignore parse errors — regenerate identity
  }
  const identity = { name: randomUserName(), color: randomColor() };
  try {
    localStorage.setItem(key, JSON.stringify(identity));
  } catch {
    // localStorage may be full or unavailable
  }
  return identity;
}

/**
 * Create a collab session for a setup.
 *
 * Room name = `strinoplant:{setupId}:{token}`.
 * Legacy `?collab=1` links keep using `strinoplant:{setupId}`.
 * Uses the configured P2P transport (Trystero by default; y-webrtc only when explicitly set).
 */
export function createCollabSession(setupId: string, collabToken?: string | null): CollabState {
  const roomName = getCollabRoomName(setupId, collabToken);

  const existingEntry = sessionRegistry.get(roomName);
  if (existingEntry && !existingEntry.isDestroyed) {
    if (existingEntry.destroyTimer) {
      clearTimeout(existingEntry.destroyTimer);
      existingEntry.destroyTimer = null;
    }

    existingEntry.refCount += 1;
    existingEntry.awareness.setLocalStateField("user", getUserIdentity());

    return createSessionHandle(existingEntry);
  }

  if (existingEntry?.isDestroyed) {
    sessionRegistry.delete(roomName);
  }

  const doc = new Y.Doc();
  const provider = createTransportProvider(roomName, doc);

  const entry: CollabSessionEntry = {
    roomName,
    doc,
    provider,
    awareness: provider.awareness,
    refCount: 1,
    destroyTimer: null,
    isDestroyed: false,
  };

  const handleDocDestroy = () => {
    entry.isDestroyed = true;

    if (entry.destroyTimer) {
      clearTimeout(entry.destroyTimer);
      entry.destroyTimer = null;
    }

    if (sessionRegistry.get(roomName) === entry) {
      sessionRegistry.delete(roomName);
    }

    doc.off("destroy", handleDocDestroy);
  };

  doc.on("destroy", handleDocDestroy);
  sessionRegistry.set(roomName, entry);

  const identity = getUserIdentity();
  provider.awareness.setLocalStateField("user", identity);

  return createSessionHandle(entry);
}

/**
 * Destroy a collab session (cleanup on unmount).
 */
export function destroyCollabSession(
  state: CollabState,
  options?: DestroyCollabSessionOptions,
): void {
  if (releasedHandles.has(state)) return;

  releasedHandles.add(state);

  const entry = sessionHandles.get(state);
  if (!entry) {
    try {
      state.provider.destroy();
    } catch {
      // Ignore duplicate or stale provider destroy calls.
    }

    try {
      state.doc.destroy();
    } catch {
      // Ignore duplicate or stale destroy calls.
    }
    return;
  }

  if (entry.isDestroyed) return;

  entry.refCount = Math.max(0, entry.refCount - 1);

  if (entry.refCount === 0) {
    if (options?.immediate) {
      finalizeSessionEntry(entry);
    } else {
      scheduleSessionDestroy(entry);
    }
  }
}

/**
 * Generate a shareable collab link for a setup.
 *
 * Format: `{origin}{basePath}/map/{mapId}/edit/?setupId={setupId}&collab={token}`
 */
export function generateCollabLink(
  mapId: string,
  setupId: string,
  collabToken?: string | null,
): string {
  return toAbsoluteUrl(
    getSetupEditorHref(mapId, {
      setupId,
      collabToken: normalizeCollabToken(collabToken),
    }),
  );
}
