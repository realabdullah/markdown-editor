import { openDB, type IDBPDatabase } from "idb";
import {
  WorkspaceBaselineChangedError,
  WorkspaceFileExistsError,
  WorkspaceWriteVerificationError,
} from "./workspaceErrors";
import { hashContent, toConflictPath } from "./workspacePaths";
import { scanWorkspace } from "./workspaceScanner";
import type {
  MigrationMarker,
  MigrationSource,
  MigrationTarget,
} from "./workspaceMigration";
import type {
  WorkspaceConflict,
  WorkspaceDocument,
  WorkspaceDraft,
  WorkspaceRepository,
  WorkspaceScanResult,
  WorkspaceSession,
  WorkspaceViewMode,
} from "~/types/workspace";

const DB_NAME = "markdown_editor_workspace";
const DB_VERSION = 3;
const HANDLE_STORE = "directory_handles";
const DRAFT_STORE = "recovery_drafts";
const STATE_STORE = "workspace_state";
const MIGRATION_STORE = "migration_markers";
const CURRENT_WORKSPACE = "current";
// The preferred pane layout is a per-device preference, not a per-folder one.
const VIEW_MODE_KEY = "viewMode";

interface PersistedWorkspace {
  id: string;
  handle: FileSystemDirectoryHandle;
}

export interface WorkspaceFileSystemAdapter {
  isSupported: () => boolean;
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
  saveMigrationMarker: (marker: MigrationMarker) => Promise<void>;
  loadMigrationMarker: (
    workspaceId: string,
    source: MigrationSource,
    documentId: string,
  ) => Promise<MigrationMarker | null>;
  saveMigrationDismissed: (workspaceId: string) => Promise<void>;
  loadMigrationDismissed: (workspaceId: string) => Promise<boolean>;
}

const draftKey = (workspaceId: string, path: string) =>
  `${workspaceId}:${path}`;

const markerKey = (
  workspaceId: string,
  source: MigrationSource,
  documentId: string,
) => `${workspaceId}:${source}:${documentId}`;

const REQUIRED_STORES = [
  HANDLE_STORE,
  DRAFT_STORE,
  STATE_STORE,
  MIGRATION_STORE,
] as const;

const createMissingStores = (database: IDBPDatabase) => {
  for (const store of REQUIRED_STORES) {
    if (!database.objectStoreNames.contains(store)) {
      database.createObjectStore(store);
    }
  }
};

let connection: Promise<IDBPDatabase> | null = null;

/**
 * A store added to this file after a browser first created the database would
 * otherwise stay missing until `DB_VERSION` changed, and every read of it would
 * throw `NotFoundError`. Opening unversioned first tells us what the browser
 * actually holds; reopening one version above that creates whatever is absent,
 * so a forgotten version bump cannot strand anyone.
 */
const connect = async (): Promise<IDBPDatabase> => {
  const current = await openDB(DB_NAME);
  const isComplete = REQUIRED_STORES.every((store) =>
    current.objectStoreNames.contains(store),
  );
  if (isComplete && current.version >= DB_VERSION) return current;

  const version = Math.max(current.version + 1, DB_VERSION);
  current.close();
  return openDB(DB_NAME, version, {
    upgrade: createMissingStores,
    terminated: () => {
      connection = null;
    },
  });
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
  isSupported: () => import.meta.client && "showDirectoryPicker" in window,
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
  saveMigrationMarker: async (marker) => {
    const db = await openWorkspaceDb();
    await db.put(
      MIGRATION_STORE,
      marker,
      markerKey(marker.workspaceId, marker.source, marker.documentId),
    );
  },
  loadMigrationMarker: async (workspaceId, source, documentId) => {
    const db = await openWorkspaceDb();
    return (
      (await db.get(MIGRATION_STORE, markerKey(workspaceId, source, documentId))) ??
      null
    );
  },
  saveMigrationDismissed: async (workspaceId) => {
    const db = await openWorkspaceDb();
    await db.put(STATE_STORE, true, `${workspaceId}:migrationDismissed`);
  },
  loadMigrationDismissed: async (workspaceId) => {
    const db = await openWorkspaceDb();
    return (await db.get(STATE_STORE, `${workspaceId}:migrationDismissed`)) === true;
  },
};

export class BrowserWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly fileSystem: WorkspaceFileSystemAdapter = browserWorkspaceFileSystem,
  ) {}

  isSupported = () => this.fileSystem.isSupported();

  open = async (): Promise<WorkspaceSession> => {
    const handle = await this.fileSystem.pickDirectory();
    const workspace = { id: crypto.randomUUID(), handle };
    await this.fileSystem.saveDirectory(workspace);
    return this.toSession(
      workspace,
      await this.fileSystem.getPermission(handle, false),
    );
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

  scan = (session: WorkspaceSession): Promise<WorkspaceScanResult> =>
    scanWorkspace(session.directoryHandle);

  /** Reads an image asset so the preview can show it without copying it. */
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

  /** Writes local content beside the original as `<name>.conflict.md`. */
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

  loadMigrationMarker = (
    workspaceId: string,
    source: MigrationSource,
    documentId: string,
  ) => this.fileSystem.loadMigrationMarker(workspaceId, source, documentId);

  saveMigrationDismissed = (workspaceId: string) =>
    this.fileSystem.saveMigrationDismissed(workspaceId);

  loadMigrationDismissed = (workspaceId: string) =>
    this.fileSystem.loadMigrationDismissed(workspaceId);

  /** Root-level folder names, used to place and resume legacy imports. */
  listFolders = async (session: WorkspaceSession): Promise<string[]> => {
    const names: string[] = [];
    for await (const [name, handle] of session.directoryHandle.entries()) {
      if (handle.kind === "directory") names.push(name);
    }
    return names;
  };

  /** The filesystem and marker surface the legacy migration writes through. */
  migrationTarget = (session: WorkspaceSession): MigrationTarget => ({
    listFolders: () => this.listFolders(session),
    exists: (path) => this.exists(session, path),
    read: async (path) => (await this.read(session, path)).content,
    create: async (path, content) => {
      await this.create(session, path, content);
    },
    loadMarker: (source, documentId) =>
      this.fileSystem.loadMigrationMarker(session.id, source, documentId),
    saveMarker: (marker) => this.fileSystem.saveMigrationMarker(marker),
  });

  private exists = async (session: WorkspaceSession, path: string) => {
    try {
      await this.resolveFile(session, path);
      return true;
    } catch {
      return false;
    }
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

    let directory = session.directoryHandle;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return directory.getFileHandle(name, { create });
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
