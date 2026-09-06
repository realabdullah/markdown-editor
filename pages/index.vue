<script setup lang="ts">
import { outlineIdAtLine, renderWorkspaceMarkdown } from "~/utils/workspaceMarkdown";
import type {
  WorkspaceCommand,
  WorkspaceFormatCommand,
  WorkspaceOutlineItem,
  WorkspaceSearchResult,
  WorkspaceSupportStatus,
  WorkspaceViewMode,
} from "~/types/workspace";

const {
  repository,
  session,
  tree,
  files,
  assets,
  directories,
  scanState,
  document: activeDocument,
  editorContent,
  saveStatus,
  conflict,
  errorMessage,
  isDisconnected,
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
  createDirectory,
  save,
  setEditorContent,
  restoreLastOpened,
  reconnect,
  resolveConflictByReloading,
  resolveConflictByCopy,
  dismissConflict,
  onWindowFocus,
} = useWorkspace();

const {
  viewMode,
  mobilePane,
  isNarrow,
  isPaletteOpen,
  isOutlineOpen,
  isSettingsOpen,
  showEditor,
  showPreview,
  setViewMode,
  setMobilePane,
  restoreViewMode,
  watchViewport,
  unwatchViewport,
} = useWorkspaceView();

const { appearance, theme } = useTheme();

const editorPane = ref<{
  applyFormat: (command: WorkspaceFormatCommand) => void;
  focusEditor: () => void;
  openFind: () => void;
  revealLine: (line: number, focus?: boolean) => void;
} | null>(null);
const previewPane = ref<{
  revealLine: (line: number) => void;
  revealHeading: (id: string) => void;
} | null>(null);

const isReady = ref(false);
const isBusy = ref(false);
const supportStatus = ref<WorkspaceSupportStatus>("unknown");
const secureUrl = ref("");
const isSidebarOpen = ref(false);
const openError = ref("");
const newFileName = ref("");
const selectedFolderPath = ref("");
const contextMenu = reactive({
  open: false,
  x: 0,
  y: 0,
  kind: "root" as "root" | "folder" | "file",
  parentPath: "",
});
const contextMenuTrigger = ref<HTMLElement | null>(null);
const searchQuery = ref("");

useSeoMeta({
  title: "Markdown Editor",
  description: "Edit Markdown files directly in a local folder.",
});

const isSupported = computed(() => supportStatus.value === "supported");

const SUPPORT_NOTICES: Record<string, { eyebrow: string; title: string; body: string }> = {
  "insecure-context": {
    eyebrow: "Insecure connection",
    title: "This page needs a secure connection",
    body: "Browsers only let a page read and write a folder on your device over HTTPS. This page was served over plain HTTP, so that permission is withheld — no browser will allow it on this address.",
  },
  "embedded-frame": {
    eyebrow: "Embedded page",
    title: "Open this editor in its own tab",
    body: "Folder access is blocked when the editor is embedded in a page from another site. Opening it directly at its own address restores it.",
  },
  "unsupported-browser": {
    eyebrow: "Browser support",
    title: "Open this workspace in Chrome or Edge",
    body: "This editor needs permission to read and write a folder on your device. Safari and Firefox do not offer that permission, and some Chromium browsers — Brave, for one — keep it behind a flag that is off by default.",
  },
  "mobile-browser": {
    eyebrow: "Desktop required",
    title: "Open this workspace on a computer",
    body: "No mobile browser can grant a page access to a folder on your device. Open this page in Chrome or Edge on a desktop to use your workspace.",
  },
  "no-storage": {
    eyebrow: "Site data blocked",
    title: "Allow site data for this page",
    body: "The editor remembers which folder you opened by storing it in your browser. This browser is blocking storage for this site, which usually means private browsing or a cookie and site-data setting.",
  },
};

const supportNotice = computed(
  () => SUPPORT_NOTICES[supportStatus.value] ?? SUPPORT_NOTICES["unsupported-browser"]!,
);

const assetPaths = computed(() => assets.value.map((asset) => asset.path));
const searchResults = computed(() => search(searchQuery.value));

const VIEW_MODES: { value: WorkspaceViewMode; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "split", label: "Split" },
  { value: "reading", label: "Reading" },
];

const statusLabel = computed(() => {
  if (conflict.value || saveStatus.value === "changed-externally") {
    return "Changed externally";
  }
  if (saveStatus.value === "saving") return "Saving";
  if (saveStatus.value === "failed") return "Save failed";
  if (isDirty.value) return "Unsaved";
  if (saveStatus.value === "saved") return "Saved to disk";
  return "";
});

/**
 * Where the reader's attention is, in source lines. The editor reports it
 * directly — it is the only side that knows whether the caret is still on
 * screen — and scrolling the preview takes over when that is the pane in use.
 */
const viewLine = ref(1);

const activeOutlineId = computed(() => outlineIdAtLine(outline.value, viewLine.value));

const loadWorkspace = async () => {
  if (session.value?.permissionState !== "granted") return;
  await scan();
  await restoreLastOpened();
};

const describeOpenError = (error: unknown) =>
  error instanceof Error && error.message.includes("another tab")
    ? error.message
    : "The folder could not be reopened. Choose it again to continue.";

const restoreWorkspace = async () => {
  isBusy.value = true;
  openError.value = "";
  try {
    session.value = await repository.restore();
    await loadWorkspace();
  } catch (error) {
    openError.value = describeOpenError(error);
  } finally {
    isBusy.value = false;
  }
};

/**
 * Called straight from the click so the permission prompt appears at once; the
 * folder handle is already in the session from the restore on mount, so nothing
 * has to be read back before asking.
 */
const reopenWorkspace = async () => {
  const current = session.value;
  if (!current) return;

  const granted = repository.requestAccess(current);
  isBusy.value = true;
  openError.value = "";
  try {
    session.value = await granted;
    await loadWorkspace();
  } catch (error) {
    openError.value = describeOpenError(error);
  } finally {
    isBusy.value = false;
  }
};

const chooseFolder = async () => {
  isBusy.value = true;
  openError.value = "";
  try {
    session.value = await repository.open();
    isDisconnected.value = false;
    await loadWorkspace();
  } catch (error) {
    if ((error as DOMException).name !== "AbortError") {
      openError.value = "The folder could not be opened. Check its permissions and try again.";
    }
  } finally {
    isBusy.value = false;
  }
};

const reconnectFolder = async () => {
  isBusy.value = true;
  try {
    await reconnect();
  } finally {
    isBusy.value = false;
  }
};

const openPath = async (path: string) => {
  await openFile(path);
  viewLine.value = 1;
  if (isNarrow.value) {
    isSidebarOpen.value = false;
    setMobilePane("write");
  }
};

const openSearchResult = async (result: WorkspaceSearchResult) => {
  await openPath(result.path);
  if (result.line) {
    await nextTick();
    editorPane.value?.revealLine(result.line, true);
  }
};

const submitNewFile = async () => {
  const name = newFileName.value.trim();
  if (!name) return;
  await createFile(name, selectedFolderPath.value);
  newFileName.value = "";
  if (isNarrow.value) isSidebarOpen.value = false;
};

const promptForFolder = async (parentPath = selectedFolderPath.value) => {
  contextMenu.open = false;
  const name = window.prompt("Folder name");
  if (!name?.trim()) return;
  const path = await createDirectory(name, parentPath);
  if (path) selectedFolderPath.value = path;
  contextMenu.open = false;
};

const closeContextMenu = () => {
  contextMenu.open = false;
  nextTick(() => contextMenuTrigger.value?.focus());
};

const promptForFile = async (parentPath = selectedFolderPath.value) => {
  contextMenu.open = false;
  const name = window.prompt("Markdown file name");
  if (!name?.trim()) return;
  await createFile(name, parentPath);
  contextMenu.open = false;
  if (isNarrow.value) isSidebarOpen.value = false;
};

const openTreeContextMenu = (
  event: MouseEvent,
  target: { kind: "folder" | "file"; path: string },
) => {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  contextMenu.x = Math.min(event.clientX || bounds.left + 16, window.innerWidth - 208);
  contextMenu.y = Math.min(event.clientY || bounds.top + bounds.height, window.innerHeight - 104);
  contextMenu.kind = target.kind;
  contextMenu.parentPath = target.kind === "folder"
    ? target.path
    : target.path.slice(0, Math.max(0, target.path.lastIndexOf("/")));
  selectedFolderPath.value = contextMenu.parentPath;
  contextMenuTrigger.value = event.currentTarget as HTMLElement;
  contextMenu.open = true;
};

const goToHeading = (item: WorkspaceOutlineItem) => {
  editorPane.value?.revealLine(item.line, showEditor.value);
  previewPane.value?.revealHeading(item.id);
};

/**
 * Each pane ignores the scroll event its own programmatic scroll provokes, so
 * the two never chase each other and neither needs to be locked out. A timed
 * lockout would make the follower drop updates and then catch up in a jump.
 */
const onEditorScroll = (line: number) => {
  if (showPreview.value) previewPane.value?.revealLine(line);
};

const onPreviewScroll = (line: number) => {
  viewLine.value = line;
  if (showEditor.value) editorPane.value?.revealLine(line);
};

const readAsset = async (path: string) => {
  const active = session.value;
  if (!active) return null;
  try {
    return await repository.readAsset(active, path);
  } catch {
    return null;
  }
};

const download = (content: string, fileName: string, type: string) => {
  const link = window.document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

const baseFileName = computed(
  () => activeDocument.value?.path.split("/").pop() ?? "document.md",
);

const exportMarkdown = () =>
  download(editorContent.value, baseFileName.value, "text/markdown;charset=utf-8");

const exportHtml = () => {
  // Carries the author's theme inlined, so it fetches nothing wherever it opens.
  const page = standaloneHtml({
    title: baseFileName.value,
    body: renderWorkspaceMarkdown(editorContent.value, activeDocument.value?.path ?? ""),
    theme: theme.value,
  });
  download(page, baseFileName.value.replace(/\.md$/i, ".html"), "text/html;charset=utf-8");
};

const copyMarkdown = async () => {
  try {
    await navigator.clipboard.writeText(editorContent.value);
  } catch {
    errorMessage.value = "The clipboard is not available in this browser.";
  }
};

const focusWorkspaceSearch = () => {
  isSidebarOpen.value = true;
  nextTick(() => {
    window.document.getElementById("workspace-search")?.focus();
  });
};

const commands = computed<WorkspaceCommand[]>(() => [
  { id: "save", label: "Save to disk", hint: "Ctrl S", run: save },
  {
    id: "find",
    label: "Find in this file",
    hint: "Ctrl F",
    run: () => editorPane.value?.openFind(),
  },
  {
    id: "search",
    label: "Search the workspace",
    hint: "Ctrl Shift F",
    run: focusWorkspaceSearch,
  },
  ...VIEW_MODES.map((mode) => ({
    id: `view-${mode.value}`,
    label: `Switch to ${mode.label.toLowerCase()} mode`,
    hint: "View",
    run: () => setViewMode(mode.value),
  })),
  {
    id: "outline",
    label: isOutlineOpen.value ? "Hide the outline" : "Show the outline",
    hint: "View",
    run: () => {
      isOutlineOpen.value = !isOutlineOpen.value;
    },
  },
  { id: "export-md", label: "Download a copy (.md)", hint: "Export", run: exportMarkdown },
  { id: "export-html", label: "Download rendered HTML", hint: "Export", run: exportHtml },
  { id: "copy-md", label: "Copy Markdown to clipboard", hint: "Export", run: copyMarkdown },
  { id: "folder", label: "Change workspace folder…", hint: "Workspace", run: chooseFolder },
  {
    id: "settings",
    label: "Open settings",
    hint: "Ctrl ,",
    run: () => {
      isSettingsOpen.value = true;
    },
  },
]);

const handleKeydown = (event: KeyboardEvent) => {
  const isMeta = event.metaKey || event.ctrlKey;
  if (!isMeta) return;
  const key = event.key.toLowerCase();

  if (key === "s") {
    event.preventDefault();
    void save();
    return;
  }
  if (key === "p" || key === "k") {
    event.preventDefault();
    isPaletteOpen.value = true;
    return;
  }
  if (event.shiftKey && key === "f") {
    event.preventDefault();
    focusWorkspaceSearch();
    return;
  }
  if (key === ",") {
    event.preventDefault();
    isSettingsOpen.value = true;
  }
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (isDirty.value) event.preventDefault();
};

const handleFocus = () => {
  void onWindowFocus();
};

onMounted(async () => {
  supportStatus.value = repository.getSupport();
  if (supportStatus.value === "insecure-context") {
    secureUrl.value = window.location.href.replace(/^http:/, "https:");
  }
  if (isSupported.value) {
    watchViewport();
    await restoreViewMode();
    await restoreWorkspace();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
  isReady.value = true;
});

onBeforeUnmount(() => {
  unwatchViewport();
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <main class="min-h-full bg-app text-ink">
    <div
      v-if="!isReady"
      class="flex min-h-screen items-center justify-center"
      aria-live="polite"
    >
      <p class="text-sm text-ink-subtle">
        Loading workspace…
      </p>
    </div>

    <section
      v-else-if="!isSupported"
      class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16"
    >
      <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-subtle">
        {{ supportNotice.eyebrow }}
      </p>
      <h1 class="text-3xl font-semibold tracking-tight">
        {{ supportNotice.title }}
      </h1>
      <p class="mt-4 max-w-xl text-ink-muted">
        {{ supportNotice.body }}
      </p>

      <p
        v-if="secureUrl"
        class="mt-4 text-sm text-ink-muted"
      >
        Try
        <a
          class="underline underline-offset-4 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :href="secureUrl"
        >{{ secureUrl }}</a>
        — if that address does not load, the site has no certificate yet and only whoever deployed it can fix this.
      </p>
    </section>

    <section
      v-else
      class="flex h-[100dvh] flex-col bg-panel"
    >
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-5">
        <button
          v-if="session?.permissionState === 'granted'"
          class="rounded-md border border-line-strong px-2.5 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:hidden"
          type="button"
          :aria-expanded="isSidebarOpen"
          aria-controls="workspace-sidebar"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          Files
        </button>

        <p class="min-w-0 flex-1 truncate font-medium">
          {{ session?.directoryName || "Markdown Workspace" }}
        </p>

        <div
          v-if="session?.permissionState === 'granted'"
          class="hidden items-center rounded-md border border-line-strong p-0.5 lg:flex"
          role="group"
          aria-label="View mode"
        >
          <button
            v-for="mode in VIEW_MODES"
            :key="mode.value"
            class="rounded px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            :class="
              viewMode === mode.value
                ? 'bg-accent text-accent-fg'
                : 'text-ink-muted hover:bg-raised'
            "
            type="button"
            :aria-pressed="viewMode === mode.value"
            @click="setViewMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>

        <div
          v-if="session?.permissionState === 'granted'"
          class="flex items-center rounded-md border border-line-strong p-0.5 lg:hidden"
          role="group"
          aria-label="Pane"
        >
          <button
            v-for="pane in (['write', 'read'] as const)"
            :key="pane"
            class="rounded px-2.5 py-1 text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            :class="
              mobilePane === pane
                ? 'bg-accent text-accent-fg'
                : 'text-ink-muted'
            "
            type="button"
            :aria-pressed="mobilePane === pane"
            @click="setMobilePane(pane)"
          >
            {{ pane }}
          </button>
        </div>

        <button
          v-if="session?.permissionState === 'granted'"
          class="hidden rounded-md border border-line-strong px-2.5 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:block"
          type="button"
          :aria-pressed="isOutlineOpen"
          @click="isOutlineOpen = !isOutlineOpen"
        >
          Outline
        </button>

        <p
          v-if="statusLabel"
          class="hidden text-sm text-ink-muted sm:block"
          aria-live="polite"
        >
          {{ statusLabel }}
        </p>

        <button
          v-if="activeDocument"
          class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
          type="button"
          :disabled="!isDirty || saveStatus === 'saving'"
          @click="save"
        >
          Save
        </button>

        <button
          v-if="!session"
          class="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
          type="button"
          :disabled="isBusy"
          @click="chooseFolder"
        >
          Choose folder
        </button>
        <WorkspaceOverflowMenu
          v-else
          :has-document="!!activeDocument"
          @export-markdown="exportMarkdown"
          @export-html="exportHtml"
          @copy-markdown="copyMarkdown"
          @open-settings="isSettingsOpen = true"
          @change-folder="chooseFolder"
        />
      </header>

      <div
        v-if="session?.permissionState === 'granted'"
        class="flex min-h-0 flex-1"
      >
        <aside
          id="workspace-sidebar"
          class="w-72 shrink-0 flex-col border-r border-line lg:static lg:z-auto lg:flex"
          :class="isSidebarOpen ? 'absolute inset-y-14 left-0 z-30 flex bg-panel' : 'hidden'"
        >
          <WorkspaceSearch
            v-model="searchQuery"
            class="shrink-0"
            :results="searchResults"
            :indexed-count="indexedCount"
            :file-count="files.length"
            @open="openSearchResult"
          />

          <nav
            v-show="!searchQuery.trim()"
            class="min-h-0 flex-1 overflow-auto px-2 pb-2"
            aria-label="Workspace files"
            @contextmenu.self.prevent="openTreeContextMenu($event, { kind: 'folder', path: '' })"
          >
            <p
              v-if="scanState === 'scanning'"
              class="px-2 py-1 text-sm text-ink-subtle"
            >
              Scanning folder…
            </p>
            <p
              v-else-if="!files.length && !directories.length"
              class="px-2 py-1 text-sm text-ink-subtle"
            >
              No Markdown files found in this folder.
            </p>
            <WorkspaceTree
              v-else
              :folder="tree"
              :active-path="activeDocument?.path || ''"
              :selected-folder-path="selectedFolderPath"
              @open="openPath"
              @select-folder="selectedFolderPath = $event"
              @context="openTreeContextMenu"
            />
          </nav>

          <form
            class="shrink-0 border-t border-line p-3"
            @submit.prevent="submitNewFile"
          >
            <p
              class="mb-2 truncate text-xs text-ink-subtle"
              :title="selectedFolderPath || 'Workspace root'"
            >
              Create in {{ selectedFolderPath || "Workspace root" }}
            </p>
            <div class="flex gap-2">
              <label
                class="sr-only"
                for="workspace-new-file"
              >New Markdown file name</label>
              <input
                id="workspace-new-file"
                v-model="newFileName"
                class="min-w-0 flex-1 rounded-md border border-line-strong bg-transparent px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                placeholder="new-note.md"
                type="text"
              >
              <button
                class="rounded-md border border-line-strong px-2.5 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                type="submit"
              >
                New
              </button>
              <button
                class="rounded-md border border-line-strong px-2.5 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                type="button"
                aria-label="Create a new folder"
                @click="promptForFolder()"
              >
                Folder
              </button>
            </div>
          </form>
        </aside>

        <section class="flex min-w-0 flex-1 flex-col">
          <div
            v-if="activeDocument"
            class="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4"
          >
            <p class="truncate text-sm text-ink-muted">
              <span class="sr-only">Workspace path:</span>{{ activeDocument.path }}
            </p>
            <p
              v-if="statusLabel"
              class="shrink-0 text-xs text-ink-subtle sm:hidden"
              aria-live="polite"
            >
              {{ statusLabel }}
            </p>
          </div>

          <p
            v-if="recoveredDraftPath && recoveredDraftPath === activeDocument?.path"
            class="border-b border-warning-border bg-warning-surface px-4 py-2 text-sm text-warning-fg"
            role="status"
          >
            Recovered unsaved changes from your last session. Save to write them to disk.
          </p>

          <div
            v-if="isDisconnected"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-warning-border bg-warning-surface px-4 py-2 text-sm text-warning-fg"
            role="alert"
          >
            <p>{{ errorMessage }}</p>
            <button
              class="shrink-0 rounded-md border border-warning-border px-3 py-1.5 text-sm font-medium hover:bg-warning-border/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              type="button"
              :disabled="isBusy"
              @click="reconnectFolder"
            >
              Reconnect folder
            </button>
          </div>

          <p
            v-else-if="errorMessage || openError"
            class="border-b border-danger-border bg-danger-surface px-4 py-2 text-sm text-danger-fg"
            role="alert"
          >
            {{ errorMessage || openError }}
          </p>

          <WorkspaceFormatBar
            v-if="activeDocument && showEditor"
            class="shrink-0"
            @format="editorPane?.applyFormat($event)"
          />

          <div
            v-if="activeDocument"
            class="flex min-h-0 flex-1"
          >
            <div
              v-show="showEditor"
              class="min-w-0 flex-1"
            >
              <WorkspaceEditorPane
                ref="editorPane"
                :key="activeDocument.path"
                :model-value="editorContent"
                :appearance="appearance"
                :document-path="activeDocument.path"
                :asset-paths="assetPaths"
                @update:model-value="setEditorContent"
                @cursor="setCursor"
                @place="viewLine = $event"
                @scroll-line="onEditorScroll"
                @save="save"
              />
            </div>

            <div
              v-show="showPreview"
              class="min-w-0 flex-1 border-l border-line"
              :class="!showEditor && 'border-l-0'"
            >
              <WorkspacePreview
                ref="previewPane"
                :source="editorContent"
                :document-path="activeDocument.path"
                :resolve-asset="readAsset"
                @scroll-line="onPreviewScroll"
              />
            </div>

            <aside
              v-if="isOutlineOpen && !isNarrow"
              class="hidden w-60 shrink-0 flex-col border-l border-line lg:flex"
            >
              <p class="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                Outline
              </p>
              <WorkspaceOutline
                class="flex-1"
                :items="outline"
                :active-id="activeOutlineId"
                @select="goToHeading"
              />
            </aside>
          </div>

          <div
            v-else
            class="flex flex-1 items-center justify-center px-6"
          >
            <div class="max-w-md text-center">
              <h2 class="text-lg font-medium">
                Nothing open yet
              </h2>
              <p class="mt-2 text-sm text-ink-muted">
                Choose a file from the list, search the folder, or create a new
                Markdown file. Nothing is written to disk until you save.
              </p>
              <dl class="mx-auto mt-6 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
                <dt class="font-mono text-xs text-ink-subtle">
                  Ctrl P
                </dt>
                <dd class="text-ink-muted">
                  Go to a file or command
                </dd>
                <dt class="font-mono text-xs text-ink-subtle">
                  Ctrl Shift F
                </dt>
                <dd class="text-ink-muted">
                  Search every file
                </dd>
                <dt class="font-mono text-xs text-ink-subtle">
                  Ctrl S
                </dt>
                <dd class="text-ink-muted">
                  Save to disk
                </dd>
              </dl>
            </div>
          </div>

          <div
            v-if="activeDocument"
            class="flex h-8 shrink-0 items-center gap-4 border-t border-line px-4 text-xs text-ink-subtle"
          >
            <p>{{ stats.words }} words</p>
            <p>{{ stats.characters }} characters</p>
            <p>Line {{ cursor.line }}, column {{ cursor.column }}</p>
            <p v-if="cursor.selected">
              {{ cursor.selected }} selected
            </p>
          </div>
        </section>
      </div>

      <div
        v-else
        class="flex flex-1 items-center justify-center px-6 py-16"
      >
        <div class="w-full max-w-lg text-center">
          <template v-if="session">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              Saved workspace
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight">
              {{ session.directoryName }}
            </h1>
            <p class="mt-3 text-ink-muted">
              Reopen the folder to restore access after this reload.
            </p>
            <button
              class="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-50"
              type="button"
              :disabled="isBusy"
              @click="reopenWorkspace"
            >
              {{ isBusy ? "Waiting for permission…" : "Reopen workspace" }}
            </button>
          </template>

          <template v-else>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              Local-first Markdown
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight">
              Choose a folder to begin
            </h1>
            <p class="mt-3 text-ink-muted">
              Your Markdown files stay on disk and remain visible to Git and your other tools.
            </p>
            <button
              class="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-50"
              type="button"
              :disabled="isBusy"
              @click="chooseFolder"
            >
              Choose folder
            </button>
          </template>

          <p
            v-if="openError"
            class="mt-5 text-sm text-danger-fg"
            role="alert"
          >
            {{ openError }}
          </p>
        </div>
      </div>
    </section>

    <WorkspaceCommandPalette
      v-model:open="isPaletteOpen"
      :files="files"
      :commands="commands"
      @open-file="openPath"
    />

    <WorkspaceSettingsDialog v-model:open="isSettingsOpen" />

    <WorkspaceContextMenu
      :open="contextMenu.open"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :kind="contextMenu.kind"
      @close="closeContextMenu"
      @new-file="promptForFile(contextMenu.parentPath)"
      @new-folder="promptForFolder(contextMenu.parentPath)"
    />

    <WorkspaceConflictDialog
      v-if="conflict"
      :conflict="conflict"
      @reload="resolveConflictByReloading"
      @save-copy="resolveConflictByCopy"
      @cancel="dismissConflict"
    />
  </main>
</template>
