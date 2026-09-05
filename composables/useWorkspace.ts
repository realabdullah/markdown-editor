import { isPermissionError } from "~/repositories/workspaceErrors";
import { workspaceSearchIndex } from "~/repositories/workspaceIndex";
import { fileNameOf, toMarkdownPath } from "~/repositories/workspacePaths";
import { buildWorkspaceTree } from "~/repositories/workspaceScanner";
import { countDocumentStats, extractOutline } from "~/utils/workspaceMarkdown";
import {
  isWorkspaceConflict,
  type WorkspaceAsset,
  type WorkspaceConflict,
  type WorkspaceCursorPosition,
  type WorkspaceDocument,
  type WorkspaceFile,
  type WorkspaceSaveStatus,
  type WorkspaceSearchResult,
  type WorkspaceSession,
} from "~/types/workspace";

/** Recovery drafts are written this long after the last keystroke. */
export const DRAFT_DEBOUNCE_MS = 300;

export const useWorkspace = () => {
  const repository = useWorkspaceRepository();

  const session = useState<WorkspaceSession | null>("workspaceSession", () => null);
  const files = useState<WorkspaceFile[]>("workspaceFiles", () => []);
  const assets = useState<WorkspaceAsset[]>("workspaceAssets", () => []);
  const scanState = useState<WorkspaceSession["scanState"]>(
    "workspaceScanState",
    () => "idle",
  );
  const document = useState<WorkspaceDocument | null>("workspaceDocument", () => null);
  const editorContent = useState<string>("workspaceEditorContent", () => "");
  const saveStatus = useState<WorkspaceSaveStatus>("workspaceSaveStatus", () => "idle");
  const conflict = useState<WorkspaceConflict | null>("workspaceConflict", () => null);
  const errorMessage = useState<string>("workspaceError", () => "");
  const recoveredDraftPath = useState<string>("workspaceRecoveredDraft", () => "");
  const cursor = useState<WorkspaceCursorPosition>("workspaceCursor", () => ({
    line: 1,
    column: 1,
    selected: 0,
  }));

  const tree = computed(() => buildWorkspaceTree(files.value));
  const isDirty = computed(
    () => !!document.value && editorContent.value !== document.value.content,
  );
  const indexedCount = computed(
    () => files.value.filter((file) => file.indexStatus === "indexed").length,
  );
  const outline = computed(() => extractOutline(editorContent.value));
  const stats = computed(() => countDocumentStats(editorContent.value));

  /**
   * Path matches first, then content matches from the incremental index. Files
   * that matched on their path are not repeated as content hits.
   */
  const search = (query: string, limit = 30): WorkspaceSearchResult[] => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const results: WorkspaceSearchResult[] = [];
    const matchedPaths = new Set<string>();

    for (const file of files.value) {
      if (!file.path.toLowerCase().includes(term)) continue;
      matchedPaths.add(file.path);
      results.push({ path: file.path, name: file.name });
      if (results.length >= limit) return results;
    }

    for (const hit of workspaceSearchIndex.search(term, limit)) {
      if (matchedPaths.has(hit.path)) continue;
      results.push({
        path: hit.path,
        name: fileNameOf(hit.path),
        line: hit.line,
        excerpt: hit.excerpt,
      });
      if (results.length >= limit) break;
    }

    return results;
  };

  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  let scanGeneration = 0;

  const reportError = (error: unknown, fallback: string) => {
    errorMessage.value = isPermissionError(error)
      ? "Folder access was denied. Reopen the workspace to continue."
      : fallback;
    if (isPermissionError(error) && session.value) {
      session.value = { ...session.value, permissionState: "prompt" };
    }
  };

  /** Builds the tree first, then fills the content index one file at a time. */
  const scan = async () => {
    const active = session.value;
    if (!active) return;

    scanState.value = "scanning";
    const generation = (scanGeneration += 1);

    try {
      const { files: scanned, assets: scannedAssets } =
        await repository.scan(active);
      if (generation !== scanGeneration) return;

      // Files that are unchanged on disk keep the index built for them earlier.
      const previous = new Map(files.value.map((file) => [file.path, file]));
      for (const file of scanned) {
        const before = previous.get(file.path);
        if (
          file.indexStatus === "pending" &&
          before?.indexStatus === "indexed" &&
          before.size === file.size &&
          before.lastModified === file.lastModified &&
          workspaceSearchIndex.has(file.path)
        ) {
          file.indexStatus = "indexed";
        }
      }

      for (const path of previous.keys()) {
        if (!scanned.some((file) => file.path === path)) {
          workspaceSearchIndex.delete(path);
        }
      }

      files.value = scanned;
      assets.value = scannedAssets;
      scanState.value = "complete";
      void indexContents(generation);
    } catch (error) {
      scanState.value = "failed";
      reportError(error, "The workspace could not be scanned.");
    }
  };

  const indexContents = async (generation: number) => {
    const active = session.value;
    if (!active) return;

    for (const file of files.value) {
      if (generation !== scanGeneration) return;
      if (file.indexStatus !== "pending") continue;
      try {
        const { content } = await repository.read(active, file.path);
        workspaceSearchIndex.set(file.path, content);
        file.indexStatus = "indexed";
      } catch {
        // A file that disappeared mid-scan is picked up by the next rescan.
      }
    }
  };

  const scheduleDraft = () => {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      void persistDraft();
    }, DRAFT_DEBOUNCE_MS);
  };

  const persistDraft = async () => {
    const active = session.value;
    const current = document.value;
    if (!active || !current) return;

    if (!isDirty.value) {
      await repository.clearDraft(active.id, current.path);
      return;
    }

    await repository.saveDraft({
      workspaceId: active.id,
      path: current.path,
      content: editorContent.value,
      baselineHash: current.baselineHash,
      updatedAt: Date.now(),
    });
  };

  const setEditorContent = (value: string) => {
    editorContent.value = value;
    if (saveStatus.value !== "changed-externally") {
      saveStatus.value = isDirty.value ? "unsaved" : "saved";
    }
    scheduleDraft();
  };

  const openFile = async (path: string) => {
    const active = session.value;
    if (!active) return;

    errorMessage.value = "";
    conflict.value = null;
    recoveredDraftPath.value = "";

    try {
      // Flush the outgoing document's draft before switching away from it.
      if (draftTimer) clearTimeout(draftTimer);
      await persistDraft();

      const opened = await repository.read(active, path);
      const draft = await repository.loadDraft(active.id, path);

      document.value = opened;
      editorContent.value = opened.content;
      saveStatus.value = "saved";

      if (draft && draft.content !== opened.content) {
        editorContent.value = draft.content;
        recoveredDraftPath.value = path;
        saveStatus.value =
          draft.baselineHash === opened.baselineHash ? "unsaved" : "changed-externally";

        if (draft.baselineHash !== opened.baselineHash) {
          conflict.value = {
            kind: "conflict",
            path,
            baselineHash: draft.baselineHash,
            localContent: draft.content,
            externalContent: opened.content,
            externalMetadata: opened.diskMetadata,
          };
        }
      }

      await repository.saveLastOpened(active.id, path);
    } catch (error) {
      reportError(error, `${path} could not be opened.`);
    }
  };

  const createFile = async (name: string, parentPath = "") => {
    const active = session.value;
    if (!active) return;

    const path = toMarkdownPath(name, parentPath);
    errorMessage.value = "";
    try {
      const created = await repository.create(active, path, "");
      await scan();
      document.value = created;
      editorContent.value = created.content;
      saveStatus.value = "saved";
      await repository.saveLastOpened(active.id, path);
    } catch (error) {
      reportError(error, `${path} could not be created.`);
    }
  };

  /** Manual save: rescan the file first, then write and verify. */
  const save = async () => {
    const active = session.value;
    const current = document.value;
    if (!active || !current || !isDirty.value) return;

    errorMessage.value = "";
    saveStatus.value = "saving";

    try {
      const refreshed = await repository.refresh(active, {
        ...current,
        content: editorContent.value,
        isDirty: true,
      });

      if (isWorkspaceConflict(refreshed)) {
        conflict.value = refreshed;
        saveStatus.value = "changed-externally";
        return;
      }

      const saved = await repository.write(active, {
        ...current,
        content: editorContent.value,
        isDirty: true,
      });

      document.value = saved;
      editorContent.value = saved.content;
      saveStatus.value = "saved";
      workspaceSearchIndex.set(saved.path, saved.content);
      await repository.clearDraft(active.id, saved.path);
      await scan();
    } catch (error) {
      saveStatus.value = "failed";
      reportError(error, `${current.path} could not be saved. Your text is kept here.`);
    }
  };

  /** Auto-reloads clean files and raises a conflict for dirty ones. */
  const refreshActiveDocument = async () => {
    const active = session.value;
    const current = document.value;
    if (!active || !current || conflict.value) return;

    try {
      const result = await repository.refresh(active, {
        ...current,
        content: editorContent.value,
        isDirty: isDirty.value,
      });

      if (isWorkspaceConflict(result)) {
        conflict.value = result;
        saveStatus.value = "changed-externally";
        return;
      }

      if (result.baselineHash !== current.baselineHash) {
        document.value = result;
        editorContent.value = result.content;
        saveStatus.value = "saved";
      } else {
        document.value = { ...current, diskMetadata: result.diskMetadata };
      }
    } catch (error) {
      reportError(error, `${current.path} could not be reread from disk.`);
    }
  };

  const resolveConflictByReloading = async () => {
    const active = session.value;
    const current = conflict.value;
    if (!active || !current) return;

    const disk = await repository.read(active, current.path);
    document.value = disk;
    editorContent.value = disk.content;
    conflict.value = null;
    saveStatus.value = "saved";
    await repository.clearDraft(active.id, current.path);
  };

  const resolveConflictByCopy = async () => {
    const active = session.value;
    const current = conflict.value;
    if (!active || !current) return;

    try {
      const copy = await repository.createConflictCopy(active, current);
      await repository.clearDraft(active.id, current.path);
      conflict.value = null;
      document.value = copy;
      editorContent.value = copy.content;
      saveStatus.value = "saved";
      await repository.saveLastOpened(active.id, copy.path);
      await scan();
    } catch (error) {
      reportError(error, "The conflict copy could not be written.");
    }
  };

  const dismissConflict = () => {
    conflict.value = null;
    saveStatus.value = isDirty.value ? "unsaved" : "saved";
  };

  const restoreLastOpened = async () => {
    const active = session.value;
    if (!active) return;
    const path = await repository.loadLastOpened(active.id);
    if (path && files.value.some((file) => file.path === path)) {
      await openFile(path);
    }
  };

  const onWindowFocus = async () => {
    if (!session.value || session.value.permissionState !== "granted") return;
    await scan();
    await refreshActiveDocument();
  };

  const setCursor = (position: WorkspaceCursorPosition) => {
    cursor.value = position;
  };

  return {
    repository,
    session,
    files,
    assets,
    tree,
    scanState,
    document,
    editorContent,
    saveStatus,
    conflict,
    errorMessage,
    recoveredDraftPath,
    isDirty,
    indexedCount,
    outline,
    stats,
    cursor,
    search,
    setCursor,
    scan,
    openFile,
    createFile,
    save,
    setEditorContent,
    refreshActiveDocument,
    restoreLastOpened,
    resolveConflictByReloading,
    resolveConflictByCopy,
    dismissConflict,
    onWindowFocus,
  };
};
