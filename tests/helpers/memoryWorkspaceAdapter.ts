import type { WorkspaceFileSystemAdapter } from "../../repositories/browserWorkspaceRepository";
import type { MigrationMarker } from "../../repositories/workspaceMigration";
import type { WorkspaceDraft, WorkspaceViewMode } from "../../types/workspace";

/** In-memory stand-in for the IndexedDB side of the workspace repository. */
export const createMemoryAdapter = (handle: FileSystemDirectoryHandle) => {
  let persisted: { id: string; handle: FileSystemDirectoryHandle } | null = null;
  let permission: PermissionState = "prompt";
  const drafts = new Map<string, WorkspaceDraft>();
  const lastOpened = new Map<string, string>();
  const markers = new Map<string, MigrationMarker>();
  const dismissed = new Set<string>();
  let viewMode: WorkspaceViewMode | null = null;

  const markerKey = (workspaceId: string, source: string, documentId: string) =>
    `${workspaceId}:${source}:${documentId}`;

  const adapter: WorkspaceFileSystemAdapter = {
    isSupported: () => true,
    pickDirectory: async () => handle,
    loadDirectory: async () => persisted,
    saveDirectory: async (workspace) => {
      persisted = workspace;
    },
    getPermission: async (_handle, requestPermission) => {
      if (requestPermission) permission = "granted";
      return permission;
    },
    saveDraft: async (draft) => {
      drafts.set(`${draft.workspaceId}:${draft.path}`, draft);
    },
    loadDraft: async (workspaceId, path) =>
      drafts.get(`${workspaceId}:${path}`) ?? null,
    clearDraft: async (workspaceId, path) => {
      drafts.delete(`${workspaceId}:${path}`);
    },
    saveLastOpened: async (workspaceId, path) => {
      lastOpened.set(workspaceId, path);
    },
    loadLastOpened: async (workspaceId) => lastOpened.get(workspaceId) ?? null,
    saveViewMode: async (mode) => {
      viewMode = mode;
    },
    loadViewMode: async () => viewMode,
    saveMigrationMarker: async (marker) => {
      markers.set(
        markerKey(marker.workspaceId, marker.source, marker.documentId),
        marker,
      );
    },
    loadMigrationMarker: async (workspaceId, source, documentId) =>
      markers.get(markerKey(workspaceId, source, documentId)) ?? null,
    saveMigrationDismissed: async (workspaceId) => {
      dismissed.add(workspaceId);
    },
    loadMigrationDismissed: async (workspaceId) => dismissed.has(workspaceId),
  };

  return {
    adapter,
    getPersisted: () => persisted,
    drafts,
    lastOpened,
    markers,
    dismissed,
  };
};
