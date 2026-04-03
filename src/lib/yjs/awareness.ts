/**
 * Awareness helpers for cursor positions and connected user presence.
 *
 * Each connected peer broadcasts their cursor position, selection state,
 * and user identity (name + color) via the Yjs awareness protocol.
 */

import type { Awareness } from "y-protocols/awareness";
import type { CollabUser } from "./provider";

export interface AwarenessState {
  user?: CollabUser;
}

/**
 * Update local cursor position in awareness.
 */
export function updateCursorPosition(awareness: Awareness, x: number, y: number): void {
  const current = (awareness.getLocalState() as AwarenessState | null)?.user;
  awareness.setLocalStateField("user", {
    ...current,
    cursor: { x, y },
  });
}

/**
 * Clear local cursor (e.g., mouse left canvas).
 */
export function clearCursor(awareness: Awareness): void {
  const current = (awareness.getLocalState() as AwarenessState | null)?.user;
  awareness.setLocalStateField("user", {
    ...current,
    cursor: null,
  });
}

/**
 * Update local selection in awareness.
 */
export function updateSelection(awareness: Awareness, selectedIds: string[]): void {
  const current = (awareness.getLocalState() as AwarenessState | null)?.user;
  awareness.setLocalStateField("user", {
    ...current,
    selection: selectedIds,
  });
}

/**
 * Get all remote users (excluding self) from awareness.
 */
export function getRemoteUsers(awareness: Awareness): Map<number, CollabUser> {
  const states = awareness.getStates();
  const localId = awareness.clientID;
  const remoteUsers = new Map<number, CollabUser>();

  states.forEach((state, clientId) => {
    if (clientId !== localId && (state as AwarenessState).user) {
      remoteUsers.set(clientId, (state as AwarenessState).user as CollabUser);
    }
  });

  return remoteUsers;
}
