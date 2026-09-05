import { hashContent } from "./workspacePaths";

export type MigrationSource = "local" | "account";

/**
 * A legacy document offered for import. Content is loaded lazily so an already
 * migrated account document never costs a network round trip on a retry.
 */
export interface MigrationDocument {
  source: MigrationSource;
  id: string;
  title: string;
  loadContent: () => Promise<string>;
}

export interface MigrationMarker {
  workspaceId: string;
  source: MigrationSource;
  documentId: string;
  path: string;
  hash: string;
  importedAt: number;
}

export interface MigrationTarget {
  /** Root-level folder names, used to find import folders from earlier runs. */
  listFolders: () => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
  read: (path: string) => Promise<string>;
  create: (path: string, content: string) => Promise<void>;
  loadMarker: (
    source: MigrationSource,
    documentId: string,
  ) => Promise<MigrationMarker | null>;
  saveMarker: (marker: MigrationMarker) => Promise<void>;
}

export interface MigrationFailure {
  source: MigrationSource;
  id: string;
  title: string;
  message: string;
}

export interface MigrationResult {
  imported: MigrationMarker[];
  /** Documents a marker or an identical existing file already accounted for. */
  skipped: MigrationMarker[];
  failed: MigrationFailure[];
}

export interface MigrationBannerState {
  /** A workspace folder is open; there is nowhere to import to without one. */
  hasWorkspace: boolean;
  isDismissed: boolean;
  localCount: number;
  accountCount: number;
  isAccountConfigured: boolean;
  /** Auth has settled, so `isSignedIn` is the answer and not the default. */
  isAuthReady: boolean;
  isSignedIn: boolean;
  /** The account list could not be read, so "none pending" is not yet known. */
  accountLoadFailed: boolean;
}

/**
 * Account documents cannot be counted while signed out, so the sign-in offer is
 * reason enough on its own to show the banner. Without that, a user whose only
 * legacy documents live in an account would never see the one control that
 * reaches them. Dismissal is remembered per workspace, so this asks once.
 */
export const isMigrationBannerVisible = (state: MigrationBannerState): boolean => {
  if (!state.hasWorkspace || state.isDismissed) return false;
  if (state.localCount > 0) return true;
  if (state.isSignedIn) return state.accountCount > 0 || state.accountLoadFailed;
  return state.isAccountConfigured && state.isAuthReady;
};

export const IMPORT_FOLDER_PREFIX = "Markdown Editor Import ";

/** `Markdown Editor Import 2026-09-05`, in the importer's own time zone. */
export const importFolderName = (date = new Date()): string => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${IMPORT_FOLDER_PREFIX}${year}-${month}-${day}`;
};

export const isImportFolderName = (name: string): boolean =>
  name.startsWith(IMPORT_FOLDER_PREFIX);

const ILLEGAL_FILE_NAME = /[\\/:*?"<>|]/g;
const CONTROL_CHARACTERS = /\p{Cc}/gu;
const MAX_BASE_NAME = 80;

/** Turns a legacy document title into a safe `.md` file name. */
export const toImportFileName = (title: string): string => {
  const base = title
    .replace(ILLEGAL_FILE_NAME, " ")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, MAX_BASE_NAME)
    .replace(/[. ]+$/, "")
    .trim();
  return `${base || "Untitled"}.md`;
};

/** The first name is unsuffixed; later collisions become `-2`, `-3`, and so on. */
export const toCollisionName = (fileName: string, attempt: number): string =>
  attempt === 0 ? fileName : fileName.replace(/\.md$/i, `-${attempt + 1}.md`);

/**
 * Finds a file this document was already written to, so a migration that was
 * interrupted before its marker was recorded resumes instead of duplicating.
 * Every import folder is searched, not only the current one.
 */
const findImportedPath = async (
  target: MigrationTarget,
  folders: string[],
  fileName: string,
  hash: string,
): Promise<string | null> => {
  for (const folder of folders) {
    for (let attempt = 0; ; attempt += 1) {
      const path = `${folder}/${toCollisionName(fileName, attempt)}`;
      if (!(await target.exists(path))) break;
      if ((await hashContent(await target.read(path))) === hash) return path;
    }
  }
  return null;
};

const findFreePath = async (
  target: MigrationTarget,
  folder: string,
  fileName: string,
  taken: Set<string>,
): Promise<string> => {
  for (let attempt = 0; ; attempt += 1) {
    const path = `${folder}/${toCollisionName(fileName, attempt)}`;
    if (taken.has(path) || (await target.exists(path))) continue;
    return path;
  }
};

/**
 * Imports every document that has no marker yet, verifying each write by
 * rereading and rehashing it before the marker is recorded. Legacy records are
 * never touched, so a retry after any failure is safe and idempotent.
 */
export const migrateDocuments = async (
  documents: MigrationDocument[],
  target: MigrationTarget,
  options: { workspaceId: string; now?: Date },
): Promise<MigrationResult> => {
  const result: MigrationResult = { imported: [], skipped: [], failed: [] };
  if (!documents.length) return result;

  const currentFolder = importFolderName(options.now ?? new Date());
  const existing = (await target.listFolders()).filter(isImportFolderName);
  const folders = existing.includes(currentFolder)
    ? existing
    : [...existing, currentFolder];
  const taken = new Set<string>();

  for (const document of documents) {
    try {
      const marker = await target.loadMarker(document.source, document.id);
      if (marker) {
        result.skipped.push(marker);
        continue;
      }

      const content = await document.loadContent();
      const hash = await hashContent(content);
      const fileName = toImportFileName(document.title);

      const resumed = await findImportedPath(target, folders, fileName, hash);
      const path =
        resumed ?? (await findFreePath(target, currentFolder, fileName, taken));
      taken.add(path);

      if (!resumed) {
        await target.create(path, content);
        if ((await hashContent(await target.read(path))) !== hash) {
          throw new Error(`${path} did not match the imported content.`);
        }
      }

      const written: MigrationMarker = {
        workspaceId: options.workspaceId,
        source: document.source,
        documentId: document.id,
        path,
        hash,
        importedAt: Date.now(),
      };
      await target.saveMarker(written);
      (resumed ? result.skipped : result.imported).push(written);
    } catch (error) {
      result.failed.push({
        source: document.source,
        id: document.id,
        title: document.title,
        message: error instanceof Error ? error.message : "The import failed.",
      });
    }
  }

  return result;
};
