export type WorkspaceIndexStatus = "pending" | "indexed" | "excluded";

export interface WorkspaceFile {
  path: string;
  name: string;
  parentPath: string;
  size: number;
  lastModified: number;
  indexStatus: WorkspaceIndexStatus;
}

export interface WorkspaceAsset {
  path: string;
  name: string;
  parentPath: string;
  size: number;
  lastModified: number;
}

export interface WorkspaceScanResult {
  files: WorkspaceFile[];
  assets: WorkspaceAsset[];
  directories: string[];
}

export interface WorkspaceFolder {
  path: string;
  name: string;
  parentPath: string;
  folders: WorkspaceFolder[];
  files: WorkspaceFile[];
}

export interface WorkspaceSession {
  id: string;
  directoryName: string;
  directoryHandle: FileSystemDirectoryHandle;
  files: WorkspaceFile[];
  scanState: "idle" | "scanning" | "complete" | "failed";
  permissionState: PermissionState;
}

export interface WorkspaceDocument {
  path: string;
  content: string;
  baselineHash: string;
  diskMetadata: Pick<WorkspaceFile, "size" | "lastModified">;
  isDirty: boolean;
  recoveryDraft?: string;
}

export interface WorkspaceConflict {
  kind: "conflict";
  path: string;
  baselineHash: string;
  localContent: string;
  externalContent: string;
  externalMetadata: Pick<WorkspaceFile, "size" | "lastModified">;
}

export interface WorkspaceDraft {
  workspaceId: string;
  path: string;
  content: string;
  baselineHash: string;
  updatedAt: number;
}

export interface WorkspaceRepository {
  open: () => Promise<WorkspaceSession>;
  restore: (requestPermission?: boolean) => Promise<WorkspaceSession | null>;
  requestAccess: (session: WorkspaceSession) => Promise<WorkspaceSession>;
  reconnect: () => Promise<WorkspaceSession>;
  scan: (session: WorkspaceSession) => Promise<WorkspaceScanResult>;
  createDirectory: (session: WorkspaceSession, path: string) => Promise<void>;
  read: (session: WorkspaceSession, path: string) => Promise<WorkspaceDocument>;
  create: (
    session: WorkspaceSession,
    path: string,
    content?: string,
  ) => Promise<WorkspaceDocument>;
  write: (
    session: WorkspaceSession,
    document: WorkspaceDocument,
  ) => Promise<WorkspaceDocument>;
  refresh: (
    session: WorkspaceSession,
    document: WorkspaceDocument,
  ) => Promise<WorkspaceDocument | WorkspaceConflict>;
}

export type WorkspaceSessionRepository = Pick<
  WorkspaceRepository,
  "open" | "restore" | "reconnect"
>;

export const isWorkspaceConflict = (
  result: WorkspaceDocument | WorkspaceConflict,
): result is WorkspaceConflict =>
  (result as WorkspaceConflict).kind === "conflict";

/** Why a workspace cannot be opened. Each value has a different remedy. */
export type WorkspaceSupportStatus =
  | "supported"
  | "unknown"
  | "insecure-context"
  | "embedded-frame"
  | "unsupported-browser"
  | "mobile-browser"
  | "no-storage";

export type WorkspaceSaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "changed-externally"
  | "failed";

/** Desktop panes. Mobile collapses `split` into a single Write/Read toggle. */
export type WorkspaceViewMode = "editor" | "split" | "reading";

export type WorkspaceMobilePane = "write" | "read";

export interface WorkspaceOutlineItem {
  id: string;
  level: number;
  text: string;
  line: number;
}

export interface WorkspaceDocumentStats {
  words: number;
  characters: number;
}

export interface WorkspaceCursorPosition {
  line: number;
  column: number;
  selected: number;
}

export interface WorkspaceSearchResult {
  path: string;
  name: string;
  /** Absent for a match on the path alone. */
  line?: number;
  excerpt?: string;
}

export interface WorkspaceCommand {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
}

/** The formatting actions the editor toolbar and shortcuts can trigger. */
export type WorkspaceFormatCommand =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "link"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "ordered"
  | "task"
  | "quote"
  | "codeblock"
  | "table";
