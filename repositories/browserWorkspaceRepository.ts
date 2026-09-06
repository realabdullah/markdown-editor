import { openDB, type IDBPDatabase } from "idb";
import {
  WorkspaceBaselineChangedError,
  WorkspaceFileExistsError,
  WorkspaceFileMissingError,
  WorkspaceRootMissingError,
  WorkspaceWriteVerificationError,
  isMissingEntryError,
} from "./workspaceErrors";
import { hashContent, toConflictPath } from "./workspacePaths";
import { scanWorkspace } from "./workspaceScanner";
import {
  readWorkspaceEnvironment,
  resolveWorkspaceSupport,
} from "./workspaceSupport";
import type {
  WorkspaceConflict,
  WorkspaceDocument,
  WorkspaceDraft,
  WorkspaceRepository,
  WorkspaceScanResult,
  WorkspaceSession,
  WorkspaceSupportStatus,
  WorkspaceViewMode,
} from "~/types/workspace";

const DB_NAME = "markdown_editor_workspace";
const DB_VERSION = 4;
const HANDLE_STORE = "directory_handles";
const DRAFT_STORE = "recovery_drafts";
const STATE_STORE = "workspace_state";
const RETIRED_STORES = ["migration_markers"] as const;
const CURRENT_WORKSPACE = "current";
// The preferred pane layout is a per-device preference, not a per-folder one.
const VIEW_MODE_KEY = "viewMode";

interface PersistedWorkspace {
  id: string;
  handle: FileSystemDirectoryHandle;
}

export interface WorkspaceFileSystemAdapter {
  getSupport: () => WorkspaceSupportStatus;
  pickDirectory: () => Promise<FileSystemDirectoryHandle>;
  loadDirectory: () => Promise<PersistedWorkspace | null>;
  saveDirectory: (workspace: PersistedWorkspace) => Promise<void>;
  getPermission: (
    handle: FileSystemDirectoryHandle,
    requestPermission: boolean,
  ) => Promise<PermissionState>;
  saveDraft: (draft: WorkspaceDraft) => Promise<void>;
  loadDraft: (
    workspaceId: string,
    path: string,
  ) => Promise<WorkspaceDraft | null>;
  clearDraft: (workspaceId: string, path: string) => Promise<void>;
  saveLastOpened: (workspaceId: string, path: string) => Promise<void>;
  loadLastOpened: (workspaceId: string) => Promise<string | null>;
  saveViewMode: (mode: WorkspaceViewMode) => Promise<void>;
  loadViewMode: () => Promise<WorkspaceViewMode | null>;
}

const draftKey = (workspaceId: string, path: string) =>
  `${workspaceId}:${path}`;

const REQUIRED_STORES = [HANDLE_STORE, DRAFT_STORE, STATE_STORE] as const;

const createMissingStores = (database: IDBPDatabase) => {
  for (const store of REQUIRED_STORES) {
    if (!database.objectStoreNames.contains(store)) {
      database.createObjectStore(store);
    }
  }
  // Left behind by the legacy import, which no longer exists.
  for (const store of RETIRED_STORES) {
    if (database.objectStoreNames.contains(store)) {
      database.deleteObjectStore(store);
    }
  }
};

let connection: Promise<IDBPDatabase> | null = null;

const release = () => {
  connection = null;
};

/**
 * How long to wait for another tab to release the database before giving up.
 * An upgrade cannot start while an older connection is open, and a tab running
 * code from before `blocking` was handled will never close on its own, so the
 * alternative to a timeout is waiting for ever.
 */
const UPGRADE_BLOCKED_TIMEOUT = 3000;

/**
 * A store added to this file after a browser first created the database would
 * otherwise stay missing until `DB_VERSION` changed, and every read of it would
 * throw `NotFoundError`. Opening unversioned first tells us what the browser
 * actually holds; reopening one version above that creates whatever is absent,
 * so a forgotten version bump cannot strand anyone.
 */
const connect = async (): Promise<IDBPDatabase> => {
  let open: IDBPDatabase | null = null;
  // Step aside rather than hold a newer tab's upgrade behind this handle.
  const stepAside = () => {
    open?.close();
    release();
  };

  open = await openDB(DB_NAME, undefined, {
    blocking: stepAside,
    terminated: release,
  });

  const isComplete = REQUIRED_STORES.every((store) =>
    open!.objectStoreNames.contains(store),
  );
  if (isComplete && open.version >= DB_VERSION) return open;

  const version = Math.max(open.version + 1, DB_VERSION);
  open.close();
  open = null;

  let onBlocked: (() => void) | null = null;
  const upgraded = openDB(DB_NAME, version, {
    upgrade: createMissingStores,
    blocked: () => onBlocked?.(),
    blocking: stepAside,
    terminated: release,
  }).then((database) => {
    open = database;
    return database;
  });

  return Promise.race([
    upgraded,
    new Promise<never>((_resolve, reject) => {
      onBlocked = () =>
        setTimeout(
          () =>
            reject(
              new Error(
                "This workspace is open in another tab. Close it and try again.",
              ),
            ),
          UPGRADE_BLOCKED_TIMEOUT,
        );
    }),
  ]);
};

const openWorkspaceDb = (): Promise<IDBPDatabase> => {
  connection ??= connect().catch((error: unknown) => {
    // A failed open must not be cached, or every later call inherits it.
    connection = null;
    throw error;
  });
  return connection;
};

export const browserWorkspaceFileSystem: WorkspaceFileSystemAdapter = {
  getSupport: () =>
    import.meta.client
      ? resolveWorkspaceSupport(readWorkspaceEnvironment())
      : "unknown",
  pickDirectory: () => window.showDirectoryPicker({ mode: "readwrite" }),
  loadDirectory: async () => {
    const db = await openWorkspaceDb();
    return (await db.get(HANDLE_STORE, CURRENT_WORKSPACE)) ?? null;
  },
  saveDirectory: async (workspace) => {
    const db = await openWorkspaceDb();
    await db.put(HANDLE_STORE, workspace, CURRENT_WORKSPACE);
  },
  getPermission: (handle, requestPermission) =>
    requestPermission
      ? handle.requestPermission({ mode: "readwrite" })
      : handle.queryPermission({ mode: "readwrite" }),
  saveDraft: async (draft) => {
    const db = await openWorkspaceDb();
    await db.put(DRAFT_STORE, draft, draftKey(draft.workspaceId, draft.path));
  },
  loadDraft: async (workspaceId, path) => {
    const db = await openWorkspaceDb();
    return (await db.get(DRAFT_STORE, draftKey(workspaceId, path))) ?? null;
  },
  clearDraft: async (workspaceId, path) => {
    const db = await openWorkspaceDb();
    await db.delete(DRAFT_STORE, draftKey(workspaceId, path));
  },
  saveLastOpened: async (workspaceId, path) => {
    const db = await openWorkspaceDb();
    await db.put(STATE_STORE, path, `${workspaceId}:lastOpened`);
  },
  loadLastOpened: async (workspaceId) => {
    const db = await openWorkspaceDb();
    return (await db.get(STATE_STORE, `${workspaceId}:lastOpened`)) ?? null;
  },
  saveViewMode: async (mode) => {
    const db = await openWorkspaceDb();
    await db.put(STATE_STORE, mode, VIEW_MODE_KEY);
  },
  loadViewMode: async () => {
    const db = await openWorkspaceDb();
    return (await db.get(STATE_STORE, VIEW_MODE_KEY)) ?? null;
  },
};

export class BrowserWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly fileSystem: WorkspaceFileSystemAdapter = browserWorkspaceFileSystem,
  ) {}

  getSupport = () => this.fileSystem.getSupport();

  open = async (): Promise<WorkspaceSession> => {
    const handle = await this.fileSystem.pickDirectory();
    const workspace = { id: crypto.randomUUID(), handle };
    await this.fileSystem.saveDirectory(workspace);
    return this.toSession(
      workspace,
      await this.fileSystem.getPermission(handle, false),
    );
  };

  /**
   * Asks for access to the folder already held in `session`.
   *
   * The browser only shows the permission prompt while the click that asked for
   * it is still fresh, and every await before the request spends that window —
   * reading the handle back out of IndexedDB first was enough to lose it, and
   * to leave the button looking inert until the prompt finally appeared.
   */
  requestAccess = async (session: WorkspaceSession): Promise<WorkspaceSession> => {
    const permission = await this.fileSystem.getPermission(
      session.directoryHandle,
      true,
    );
    return {
      ...session,
      permissionState: permission,
    };
  };

  restore = async (
    requestPermission = false,
  ): Promise<WorkspaceSession | null> => {
    const workspace = await this.fileSystem.loadDirectory();
    if (!workspace) return null;
    const permission = await this.fileSystem.getPermission(
      workspace.handle,
      requestPermission,
    );
    return this.toSession(workspace, permission);
  };

  /**
   * Rebinds the workspace to a folder the user picks again. The id is reused so
   * recovery drafts and the last-opened file stay attached rather than being
   * orphaned under a fresh workspace.
   */
  reconnect = async (): Promise<WorkspaceSession> => {
    const previous = await this.fileSystem.loadDirectory();
    const handle = await this.fileSystem.pickDirectory();
    const workspace = { id: previous?.id ?? crypto.randomUUID(), handle };
    await this.fileSystem.saveDirectory(workspace);
    return this.toSession(
      workspace,
      await this.fileSystem.getPermission(handle, false),
    );
  };

  scan = async (session: WorkspaceSession): Promise<WorkspaceScanResult> => {
    try {
      return await scanWorkspace(session.directoryHandle);
    } catch (error) {
      throw await this.toMissingError(session, "", error);
    }
  };

  createDirectory = async (session: WorkspaceSession, path: string) => {
    const segments = path.split("/").filter(Boolean);
    if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
      throw new TypeError(`"${path}" is not a workspace directory path.`);
    }
    try {
      let directory = session.directoryHandle;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment, { create: true });
      }
    } catch (error) {
      throw await this.toMissingError(session, path, error);
    }
  };

  readAsset = async (session: WorkspaceSession, path: string): Promise<File> =>
    (await this.resolveFile(session, path)).getFile();

  read = async (
    session: WorkspaceSession,
    path: string,
  ): Promise<WorkspaceDocument> => {
    const file = await (await this.resolveFile(session, path)).getFile();
    const content = await file.text();
    return {
      path,
      content,
      baselineHash: await hashContent(content),
      diskMetadata: { size: file.size, lastModified: file.lastModified },
      isDirty: false,
    };
  };

  create = async (
    session: WorkspaceSession,
    path: string,
    content = "",
  ): Promise<WorkspaceDocument> => {
    if (await this.exists(session, path)) {
      throw new WorkspaceFileExistsError(path);
    }
    await this.writeFile(await this.resolveFile(session, path, true), content);
    return this.read(session, path);
  };

  /**
   * Saves only when the file on disk still matches the baseline the document
   * was opened with, then rereads and rehashes to confirm the write landed.
   */
  write = async (
    session: WorkspaceSession,
    document: WorkspaceDocument,
  ): Promise<WorkspaceDocument> => {
    const handle = await this.resolveFile(session, document.path);
    const current = await (await handle.getFile()).text();
    if ((await hashContent(current)) !== document.baselineHash) {
      throw new WorkspaceBaselineChangedError(document.path);
    }

    await this.writeFile(handle, document.content);

    const saved = await this.read(session, document.path);
    if (saved.baselineHash !== (await hashContent(document.content))) {
      throw new WorkspaceWriteVerificationError(document.path);
    }
    return saved;
  };

  /**
   * Returns the reloaded document when disk and document agree or the document
   * is clean, and a conflict when a dirty document diverged from disk.
   */
  refresh = async (
    session: WorkspaceSession,
    document: WorkspaceDocument,
  ): Promise<WorkspaceDocument | WorkspaceConflict> => {
    const disk = await this.read(session, document.path);

    if (disk.baselineHash === document.baselineHash) {
      return { ...document, diskMetadata: disk.diskMetadata };
    }

    if (!document.isDirty) {
      return disk;
    }

    return {
      kind: "conflict",
      path: document.path,
      baselineHash: document.baselineHash,
      localContent: document.content,
      externalContent: disk.content,
      externalMetadata: disk.diskMetadata,
    };
  };

  createConflictCopy = async (
    session: WorkspaceSession,
    conflict: WorkspaceConflict,
  ): Promise<WorkspaceDocument> => {
    for (let attempt = 0; ; attempt += 1) {
      const path = toConflictPath(conflict.path, attempt);
      if (await this.exists(session, path)) continue;
      return this.create(session, path, conflict.localContent);
    }
  };

  saveDraft = (draft: WorkspaceDraft) => this.fileSystem.saveDraft(draft);

  loadDraft = (workspaceId: string, path: string) =>
    this.fileSystem.loadDraft(workspaceId, path);

  clearDraft = (workspaceId: string, path: string) =>
    this.fileSystem.clearDraft(workspaceId, path);

  saveLastOpened = (workspaceId: string, path: string) =>
    this.fileSystem.saveLastOpened(workspaceId, path);

  loadLastOpened = (workspaceId: string) =>
    this.fileSystem.loadLastOpened(workspaceId);

  saveViewMode = (mode: WorkspaceViewMode) =>
    this.fileSystem.saveViewMode(mode);

  loadViewMode = () => this.fileSystem.loadViewMode();

  private exists = async (session: WorkspaceSession, path: string) => {
    try {
      await this.resolveFile(session, path);
      return true;
    } catch (error) {
      // A vanished root is not an answer about the path; it must not read as
      // "absent", or a create would follow and fail on the same stale handle.
      if (error instanceof WorkspaceRootMissingError) throw error;
      return false;
    }
  };

  private isRootAvailable = async (session: WorkspaceSession) => {
    try {
      await session.directoryHandle.entries().next();
      return true;
    } catch (error) {
      return !isMissingEntryError(error);
    }
  };

  /**
   * `NotFoundError` says something along the path is gone but not what, and a
   * stranded workspace and a deleted file need different repairs.
   */
  private toMissingError = async (
    session: WorkspaceSession,
    path: string,
    error: unknown,
  ): Promise<unknown> => {
    if (!isMissingEntryError(error)) return error;
    if (!(await this.isRootAvailable(session))) {
      return new WorkspaceRootMissingError(session.directoryName);
    }
    return path ? new WorkspaceFileMissingError(path) : error;
  };

  private resolveFile = async (
    session: WorkspaceSession,
    path: string,
    create = false,
  ): Promise<FileSystemFileHandle> => {
    const segments = path.split("/").filter(Boolean);
    const name = segments.pop();
    if (!name) {
      throw new TypeError(`"${path}" is not a workspace file path.`);
    }

    try {
      let directory = session.directoryHandle;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment, { create });
      }
      return await directory.getFileHandle(name, { create });
    } catch (error) {
      throw await this.toMissingError(session, path, error);
    }
  };

  private writeFile = async (handle: FileSystemFileHandle, content: string) => {
    const writable = await handle.createWritable();
    try {
      await writable.write(content);
    } finally {
      await writable.close();
    }
  };

  private toSession = (
    workspace: PersistedWorkspace,
    permissionState: PermissionState,
  ): WorkspaceSession => ({
    id: workspace.id,
    directoryName: workspace.handle.name,
    directoryHandle: workspace.handle,
    files: [],
    scanState: "idle",
    permissionState,
  });
}
