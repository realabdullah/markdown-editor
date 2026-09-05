import type { WorkspaceFileSystemAdapter } from "../../repositories/browserWorkspaceRepository";
import type { WorkspaceDraft, WorkspaceViewMode } from "../../types/workspace";

export const createMemoryAdapter = (handle: FileSystemDirectoryHandle) => {
  let pickable = handle;
  let persisted: { id: string; handle: FileSystemDirectoryHandle } | null = null;
  let permission: PermissionState = "prompt";
  const drafts = new Map<string, WorkspaceDraft>();
  const lastOpened = new Map<string, string>();
  /** Records each call, so a test can assert nothing was read before one. */
  const permissionCalls: boolean[] = [];
  let viewMode: WorkspaceViewMode | null = null;

  const adapter: WorkspaceFileSystemAdapter = {
    getSupport: () => "supported",
    pickDirectory: async () => pickable,
    loadDirectory: async () => persisted,
    saveDirectory: async (workspace) => {
      persisted = workspace;
    },
    getPermission: async (_handle, requestPermission) => {
      permissionCalls.push(requestPermission);
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
  };

  return {
    adapter,
    setPickable: (next: FileSystemDirectoryHandle) => {
      pickable = next;
    },
    getPersisted: () => persisted,
    permissionCalls,
    drafts,
    lastOpened,
  };
};
