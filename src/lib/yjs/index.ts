/**
 * Yjs collaboration infrastructure — re-exports.
 */

export {
  createCollabSession,
  destroyCollabSession,
  generateCollabLink,
  type CollabProvider,
  type CollabUser,
  type CollabState,
  type CollabTransport,
  type CollabInitialSyncState,
} from "./provider";

export {
  initYjsDoc,
  loadFromYjs,
  pushLocalToYjs,
  syncObjectToYjs,
  removeObjectFromYjs,
  syncBatchToYjs,
} from "./sync";

export {
  updateCursorPosition,
  clearCursor,
  updateSelection,
  getRemoteUsers,
  type AwarenessState,
} from "./awareness";

export { useCollab, type UseCollabOptions, type UseCollabReturn } from "./use-collab";
