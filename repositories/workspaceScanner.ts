import ignore from "ignore";
import { isImageAssetPath } from "./workspacePaths";
import type {
  WorkspaceAsset,
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceScanResult,
} from "~/types/workspace";

export const ALWAYS_EXCLUDED_DIRECTORIES = [
  ".git",
  "node_modules",
  ".nuxt",
  ".output",
  "dist",
  "coverage",
] as const;

/** Files above this size stay editable but are left out of the content index. */
export const MAX_INDEXED_FILE_SIZE = 1024 * 1024;

const excluded = new Set<string>(ALWAYS_EXCLUDED_DIRECTORIES);

const isMarkdown = (name: string) => name.toLowerCase().endsWith(".md");

export const readGitignore = async (
  root: FileSystemDirectoryHandle,
): Promise<string> => {
  try {
    const handle = await root.getFileHandle(".gitignore");
    return await (await handle.getFile()).text();
  } catch {
    return "";
  }
};

// Code-point order keeps the scan result identical across locales.
const byPath = <T extends { path: string }>(a: T, b: T) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/** Assets are recorded by path only; their bytes are read on demand. */
export const scanWorkspace = async (
  root: FileSystemDirectoryHandle,
): Promise<WorkspaceScanResult> => {
  const matcher = ignore().add(await readGitignore(root));
  const files: WorkspaceFile[] = [];
  const assets: WorkspaceAsset[] = [];
  const directories: string[] = [];

  const walk = async (directory: FileSystemDirectoryHandle, prefix: string) => {
    for await (const [name, handle] of directory.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;

      if (handle.kind === "directory") {
        if (excluded.has(name) || matcher.ignores(`${path}/`)) {
          continue;
        }
        directories.push(path);
        await walk(handle as FileSystemDirectoryHandle, path);
        continue;
      }

      const isAsset = isImageAssetPath(name);
      if ((!isMarkdown(name) && !isAsset) || matcher.ignores(path)) {
        continue;
      }

      const file = await (handle as FileSystemFileHandle).getFile();
      const entry = {
        path,
        name,
        parentPath: prefix,
        size: file.size,
        lastModified: file.lastModified,
      };

      if (isAsset) {
        assets.push(entry);
        continue;
      }

      files.push({
        ...entry,
        indexStatus: file.size > MAX_INDEXED_FILE_SIZE ? "excluded" : "pending",
      });
    }
  };

  await walk(root, "");
  return {
    files: files.sort(byPath),
    assets: assets.sort(byPath),
    directories: directories.sort(),
  };
};

export const buildWorkspaceTree = (
  files: WorkspaceFile[],
  directoryPaths: string[] = [],
): WorkspaceFolder => {
  const root: WorkspaceFolder = {
    path: "",
    name: "",
    parentPath: "",
    folders: [],
    files: [],
  };
  const folders = new Map<string, WorkspaceFolder>([["", root]]);

  const ensureFolder = (path: string): WorkspaceFolder => {
    const existing = folders.get(path);
    if (existing) {
      return existing;
    }

    const separator = path.lastIndexOf("/");
    const parentPath = separator === -1 ? "" : path.slice(0, separator);
    const folder: WorkspaceFolder = {
      path,
      name: path.slice(separator + 1),
      parentPath,
      folders: [],
      files: [],
    };
    folders.set(path, folder);
    ensureFolder(parentPath).folders.push(folder);
    return folder;
  };

  for (const path of directoryPaths) ensureFolder(path);
  for (const file of files) {
    ensureFolder(file.parentPath).files.push(file);
  }

  const sort = (folder: WorkspaceFolder) => {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name));
    folder.files.sort((a, b) => a.name.localeCompare(b.name));
    folder.folders.forEach(sort);
  };
  sort(root);

  return root;
};
