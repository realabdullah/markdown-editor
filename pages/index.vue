<script setup lang="ts">
import { outlineIdAtLine, renderWorkspaceMarkdown } from "~/utils/workspaceMarkdown";
import type { DocumentDetail } from "~/types";
import type {
  WorkspaceCommand,
  WorkspaceFormatCommand,
  WorkspaceOutlineItem,
  WorkspaceSearchResult,
  WorkspaceViewMode,
} from "~/types/workspace";

const {
  repository,
  session,
  tree,
  files,
  assets,
  scanState,
  document: activeDocument,
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
  restoreLastOpened,
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
  showEditor,
  showPreview,
  setViewMode,
  setMobilePane,
  restoreViewMode,
  watchViewport,
  unwatchViewport,
} = useWorkspaceView();

const {
  localPending,
  accountPending,
  isSignedIn,
  isAccountConfigured,
  isBannerVisible,
  isRunning: isMigrationRunning,
  statusMessage: migrationStatus,
  errorMessage: migrationError,
  detect: detectLegacyDocuments,
  dismiss: dismissMigration,
  importLocal,
  importAccount,
  signInForAccountImport,
} = useWorkspaceMigration();

const { themeMode } = useTheme();

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
const isSupported = ref(true);
const isSidebarOpen = ref(false);
const openError = ref("");
const legacyDocuments = ref<DocumentDetail[]>([]);
const newFileName = ref("");
const searchQuery = ref("");

useSeoMeta({
  title: "Markdown Editor",
  description: "Edit Markdown files directly in a local folder.",
});

const isDark = computed(() => themeMode.value === "dark");
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
  await detectLegacyDocuments();
};

const restoreWorkspace = async (requestPermission = false) => {
  isBusy.value = true;
  openError.value = "";
  try {
    session.value = await repository.restore(requestPermission);
    await loadWorkspace();
  } catch {
    openError.value = "The folder could not be reopened. Choose it again to continue.";
  } finally {
    isBusy.value = false;
  }
};

const chooseFolder = async () => {
  isBusy.value = true;
  openError.value = "";
  try {
    session.value = await repository.open();
    await loadWorkspace();
  } catch (error) {
    if ((error as DOMException).name !== "AbortError") {
      openError.value = "The folder could not be opened. Check its permissions and try again.";
    }
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
  await createFile(name);
  newFileName.value = "";
  if (isNarrow.value) isSidebarOpen.value = false;
};

/** Outline clicks move the caret in the editor and scroll the preview to match. */
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
  const body = renderWorkspaceMarkdown(
    editorContent.value,
    activeDocument.value?.path ?? "",
  );
  const page = `<!doctype html>\n<meta charset="utf-8">\n<title>${baseFileName.value}</title>\n${body}\n`;
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
  }
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (isDirty.value) event.preventDefault();
};

const handleFocus = () => {
  void onWindowFocus();
};

const downloadLegacyDocument = (document: DocumentDetail) => {
  download(
    document.content,
    `${document.title.replace(/[\\/:*?"<>|]/g, "-") || "Untitled"}.md`,
    "text/markdown;charset=utf-8",
  );
};

onMounted(async () => {
  isSupported.value = repository.isSupported();
  if (isSupported.value) {
    watchViewport();
    await restoreViewMode();
    await restoreWorkspace();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("beforeunload", handleBeforeUnload);
  } else {
    legacyDocuments.value = await useMdDocs().getDocs();
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
  <main class="min-h-full bg-zinc-100 text-zinc-950 dark:bg-[#0a0a0a] dark:text-zinc-100">
    <div
      v-if="!isReady"
      class="flex min-h-screen items-center justify-center"
      aria-live="polite"
    >
      <p class="text-sm text-zinc-500">
        Loading workspace…
      </p>
    </div>

    <section
      v-else-if="!isSupported"
      class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16"
    >
      <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Browser compatibility
      </p>
      <h1 class="text-3xl font-semibold tracking-tight">
        Open this workspace in Chrome or Edge
      </h1>
      <p class="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        This editor needs permission to read and write a folder on your device. Safari and Firefox do not currently provide that access.
      </p>

      <div
        v-if="legacyDocuments.length"
        class="mt-10 border-t border-zinc-300 pt-6 dark:border-zinc-800"
      >
        <h2 class="font-medium">
          Download your existing documents
        </h2>
        <ul class="mt-3 space-y-2">
          <li
            v-for="document in legacyDocuments"
            :key="document.id"
            class="flex items-center justify-between gap-4"
          >
            <span class="truncate text-sm text-zinc-600 dark:text-zinc-400">{{ document.title }}</span>
            <button
              class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
              type="button"
              @click="downloadLegacyDocument(document)"
            >
              Download .md
            </button>
          </li>
        </ul>
      </div>
    </section>

    <section
      v-else
      class="flex h-[100dvh] flex-col bg-white dark:bg-[#0a0a0a]"
    >
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 px-3 dark:border-zinc-800 sm:px-5">
        <button
          v-if="session?.permissionState === 'granted'"
          class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900 lg:hidden"
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
          class="hidden items-center rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700 lg:flex"
          role="group"
          aria-label="View mode"
        >
          <button
            v-for="mode in VIEW_MODES"
            :key="mode.value"
            class="rounded px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            :class="
              viewMode === mode.value
                ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-900'
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
          class="flex items-center rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700 lg:hidden"
          role="group"
          aria-label="Pane"
        >
          <button
            v-for="pane in (['write', 'read'] as const)"
            :key="pane"
            class="rounded px-2.5 py-1 text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            :class="
              mobilePane === pane
                ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400'
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
          class="hidden rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900 lg:block"
          type="button"
          :aria-pressed="isOutlineOpen"
          @click="isOutlineOpen = !isOutlineOpen"
        >
          Outline
        </button>

        <p
          v-if="statusLabel"
          class="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:block"
          aria-live="polite"
        >
          {{ statusLabel }}
        </p>

        <button
          v-if="activeDocument"
          class="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
          type="button"
          :disabled="!isDirty || saveStatus === 'saving'"
          @click="save"
        >
          Save
        </button>

        <button
          v-if="!session"
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
          @change-folder="chooseFolder"
        />
      </header>

      <WorkspaceMigrationBanner
        v-if="session?.permissionState === 'granted' && isBannerVisible"
        class="shrink-0"
        :local-count="localPending.length"
        :account-count="accountPending.length"
        :is-signed-in="isSignedIn"
        :is-account-configured="isAccountConfigured"
        :running="isMigrationRunning"
        :status-message="migrationStatus"
        :error-message="migrationError"
        @import-local="importLocal"
        @import-account="importAccount"
        @sign-in="signInForAccountImport"
        @dismiss="dismissMigration"
      />

      <div
        v-if="session?.permissionState === 'granted'"
        class="flex min-h-0 flex-1"
      >
        <aside
          id="workspace-sidebar"
          class="w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 lg:flex"
          :class="isSidebarOpen ? 'absolute inset-y-14 left-0 z-30 flex bg-white dark:bg-[#0a0a0a]' : 'hidden'"
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
          >
            <p
              v-if="scanState === 'scanning'"
              class="px-2 py-1 text-sm text-zinc-500"
            >
              Scanning folder…
            </p>
            <p
              v-else-if="!files.length"
              class="px-2 py-1 text-sm text-zinc-500"
            >
              No Markdown files found in this folder.
            </p>
            <WorkspaceTree
              v-else
              :folder="tree"
              :active-path="activeDocument?.path || ''"
              @open="openPath"
            />
          </nav>

          <form
            class="flex shrink-0 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
            @submit.prevent="submitNewFile"
          >
            <label
              class="sr-only"
              for="workspace-new-file"
            >New Markdown file name</label>
            <input
              id="workspace-new-file"
              v-model="newFileName"
              class="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700"
              placeholder="new-note.md"
              type="text"
            >
            <button
              class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
              type="submit"
            >
              New
            </button>
          </form>
        </aside>

        <section class="flex min-w-0 flex-1 flex-col">
          <div
            v-if="activeDocument"
            class="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800"
          >
            <p class="truncate text-sm text-zinc-600 dark:text-zinc-400">
              <span class="sr-only">Workspace path:</span>{{ activeDocument.path }}
            </p>
            <p
              v-if="statusLabel"
              class="shrink-0 text-xs text-zinc-500 sm:hidden"
              aria-live="polite"
            >
              {{ statusLabel }}
            </p>
          </div>

          <p
            v-if="recoveredDraftPath && recoveredDraftPath === activeDocument?.path"
            class="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            Recovered unsaved changes from your last session. Save to write them to disk.
          </p>

          <p
            v-if="errorMessage || openError"
            class="border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
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
                :is-dark="isDark"
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
              class="min-w-0 flex-1 border-l border-zinc-200 dark:border-zinc-800"
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
              class="hidden w-60 shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-800 lg:flex"
            >
              <p class="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Choose a file from the list, search the folder, or create a new
                Markdown file. Nothing is written to disk until you save.
              </p>
              <dl class="mx-auto mt-6 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
                <dt class="font-mono text-xs text-zinc-500">
                  Ctrl P
                </dt>
                <dd class="text-zinc-600 dark:text-zinc-400">
                  Go to a file or command
                </dd>
                <dt class="font-mono text-xs text-zinc-500">
                  Ctrl Shift F
                </dt>
                <dd class="text-zinc-600 dark:text-zinc-400">
                  Search every file
                </dd>
                <dt class="font-mono text-xs text-zinc-500">
                  Ctrl S
                </dt>
                <dd class="text-zinc-600 dark:text-zinc-400">
                  Save to disk
                </dd>
              </dl>
            </div>
          </div>

          <div
            v-if="activeDocument"
            class="flex h-8 shrink-0 items-center gap-4 border-t border-zinc-200 px-4 text-xs text-zinc-500 dark:border-zinc-800"
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
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Saved workspace
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight">
              {{ session.directoryName }}
            </h1>
            <p class="mt-3 text-zinc-600 dark:text-zinc-400">
              Reopen the folder to restore access after this reload.
            </p>
            <button
              class="mt-6 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
              type="button"
              :disabled="isBusy"
              @click="restoreWorkspace(true)"
            >
              Reopen workspace
            </button>
          </template>

          <template v-else>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Local-first Markdown
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight">
              Choose a folder to begin
            </h1>
            <p class="mt-3 text-zinc-600 dark:text-zinc-400">
              Your Markdown files stay on disk and remain visible to Git and your other tools.
            </p>
            <button
              class="mt-6 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
              type="button"
              :disabled="isBusy"
              @click="chooseFolder"
            >
              Choose folder
            </button>
          </template>

          <p
            v-if="openError"
            class="mt-5 text-sm text-red-700 dark:text-red-400"
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

    <WorkspaceConflictDialog
      v-if="conflict"
      :conflict="conflict"
      @reload="resolveConflictByReloading"
      @save-copy="resolveConflictByCopy"
      @cancel="dismissConflict"
    />
  </main>
</template>
