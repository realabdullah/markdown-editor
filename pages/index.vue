<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import type { ApiErrorBody, DocumentDetail, PublicationStatus } from "~/types";

const {
  documents,
  activeDocumentId,
  activeDocumentVersion,
  documentTitle,
  editorContent,
  searchQuery,
  themeMode,
  layoutMode,
  previewStyle,
  zenMode,
  isDirty,
  isDeleteOpen,
  filteredDocuments,
  applyTheme,
  hydrateTheme,
  hydrateDraft,
  cacheDraft,
  clearDraft,
  clearScopeDrafts,
  setDraftContext,
  setActiveDocument,
  resetDraft,
  updateEditor,
  updateTitle,
} = useEditorState();

const { user, initialize: initializeAuth, signOut } = useAuth();
const { repository, localDocs, importLocalDocument } = useDocumentRepository();
const { containsRemoteImages, renderMarkdown } = useMarkdown();
const { toasts, push: pushToast, dismiss } = useToasts();

const titleInput = ref<HTMLInputElement | null>(null);
const paletteInput = ref<HTMLInputElement | null>(null);
const previewRoot = ref<HTMLElement | null>(null);
const isDraggingFile = ref(false);
const sidebarCollapsed = ref(false);
const mobileSidebarOpen = ref(false);
const paletteOpen = ref(false);
const paletteQuery = ref("");
const importDialogOpen = ref(false);
const importBusy = ref(false);
const localDocuments = ref<DocumentDetail[]>([]);
const importedLocalIds = ref<string[]>([]);
const publicationDialogOpen = ref(false);
const publicationBusy = ref(false);
const publicationStatus = ref<PublicationStatus | null>(null);
const conflictDocument = ref<DocumentDetail | null>(null);
const signOutDialogOpen = ref(false);
const deleteAccountOpen = ref(false);
const deleteConfirmation = ref("");
const accountBusy = ref(false);

const storageScope = computed(() => user.value ? `user:${user.value.id}` : "guest");
const importedIdsKey = computed(() =>
  user.value ? `md-editor-imported:${user.value.id}` : "",
);

const isDark = computed(() => themeMode.value === "dark");

const rootClass = computed(() =>
  isDark.value ? "bg-[#0A0A0A] text-zinc-100" : "bg-zinc-100 text-zinc-900",
);
const borderClass = computed(() =>
  isDark.value ? "border-zinc-800/50" : "border-zinc-200",
);
const sidebarClass = computed(() =>
  isDark.value ? "bg-[#111111]" : "bg-white",
);
const chromeClass = computed(() =>
  isDark.value ? "bg-zinc-950" : "bg-zinc-50",
);
const editorPaneClass = computed(() =>
  isDark.value ? "bg-[#0A0A0A]" : "bg-white",
);
const previewPaneClass = computed(() =>
  isDark.value ? "bg-zinc-950" : "bg-zinc-50",
);
const mutedTextClass = computed(() =>
  isDark.value ? "text-zinc-500" : "text-zinc-500",
);
const strongTextClass = computed(() =>
  isDark.value ? "text-zinc-100" : "text-zinc-900",
);

const surfaceClass = computed(() =>
  isDark.value
    ? "rounded-md border border-white/5 bg-zinc-800/30"
    : "rounded-md border border-zinc-200 bg-white",
);
const controlClass = computed(() =>
  isDark.value
    ? "rounded-md border border-white/5 bg-zinc-800/30 text-zinc-100 transition-colors duration-200 ease-out hover:bg-zinc-800/70 focus:outline-none focus:ring-1 focus:ring-zinc-700"
    : "rounded-md border border-zinc-300 bg-zinc-100 text-zinc-900 transition-colors duration-200 ease-out hover:bg-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500",
);
const sidebarItemClass = computed(() =>
  isDark.value
    ? "relative flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-zinc-400 transition-colors duration-200 ease-out hover:bg-white/5 hover:text-zinc-100"
    : "relative flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-zinc-600 transition-colors duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900",
);
const sidebarItemActiveClass = computed(() =>
  isDark.value
    ? "bg-white/10 text-white before:content-[''] before:absolute before:inset-y-1 before:left-0 before:w-px before:rounded-full before:bg-zinc-200"
    : "bg-zinc-200 text-zinc-950 before:content-[''] before:absolute before:inset-y-1 before:left-0 before:w-px before:rounded-full before:bg-zinc-700",
);
const proseClass = computed(() =>
  isDark.value
    ? "prose prose-invert max-w-none prose-headings:tracking-tight prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-a:text-zinc-200 prose-code:text-zinc-200 prose-code:before:hidden prose-code:after:hidden prose-pre:border prose-pre:border-zinc-800/70 prose-pre:bg-zinc-900/60 prose-hr:border-zinc-800/70 prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-300"
    : "prose max-w-none prose-headings:tracking-tight prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-strong:text-zinc-900 prose-a:text-zinc-800 prose-code:text-zinc-900 prose-code:before:hidden prose-code:after:hidden prose-pre:border prose-pre:border-zinc-300 prose-pre:bg-zinc-100 prose-hr:border-zinc-300 prose-blockquote:border-zinc-400 prose-blockquote:text-zinc-700",
);
const layoutSwitchClass = computed(() =>
  isDark.value
    ? "hidden rounded-md border border-white/5 bg-zinc-800/30 p-1 md:flex"
    : "hidden rounded-md border border-zinc-300 bg-zinc-100 p-1 md:flex",
);
const layoutButtonClass = (mode: "editor" | "split" | "preview") => {
  const active = layoutMode.value === mode;
  if (isDark.value) {
    return active
      ? "bg-white/10 text-white"
      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100";
  }
  return active
    ? "bg-zinc-900 text-zinc-100"
    : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900";
};
const dangerButtonClass = computed(() =>
  isDark.value
    ? "rounded-md border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-200 transition-colors hover:bg-rose-500/30 focus:outline-none focus:ring-1 focus:ring-rose-400/40"
    : "rounded-md border border-rose-300 bg-rose-100 px-3 py-2 text-xs text-rose-700 transition-colors hover:bg-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-400/40",
);

const normalizeTitle = (title: string) =>
  title.trim().replace(/\.md$/i, "") || "Untitled Document";
const asMarkdownFilename = (title: string) => `${normalizeTitle(title)}.md`;
const asHtmlFilename = (title: string) => `${normalizeTitle(title)}.html`;
const asPdfFilename = (title: string) => `${normalizeTitle(title)}.pdf`;

const renderedHtml = computed(() => renderMarkdown(editorContent.value, previewStyle.value));
const hasRemoteImages = computed(() => containsRemoteImages(editorContent.value));

const paletteResults = computed(() => {
  const q = paletteQuery.value.trim().toLowerCase();
  if (!q) {
    return filteredDocuments.value.slice(0, 8);
  }
  return filteredDocuments.value
    .filter((doc) => doc.title.toLowerCase().includes(q))
    .slice(0, 8);
});

const showEditorPane = computed(() => layoutMode.value !== "preview");
const showPreviewPane = computed(() => layoutMode.value !== "editor");

const getApiError = (error: unknown) =>
  (error as { data?: ApiErrorBody })?.data;

const getUserFacingError = (error: unknown, fallback: string) => {
  const code = getApiError(error)?.data?.code;
  switch (code) {
    case "AUTHENTICATION_REQUIRED":
      return "Your session expired. Sign in and try again.";
    case "REAUTHENTICATION_REQUIRED":
      return "Sign in again before deleting your account.";
    case "DOCUMENT_LIMIT_REACHED":
      return "Your account has reached its document limit. Delete a document and try again.";
    case "RATE_LIMITED":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return fallback;
  }
};

const loadDocs = async () => {
  try {
    documents.value = await repository.value.list();
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to load documents. Try again."), "error");
  }
};

const saveCurrentDocument = async () => {
  const previousDraftId = activeDocumentId.value || "new";
  try {
    const input = {
      title: normalizeTitle(documentTitle.value),
      content: editorContent.value,
    };
    const saved = activeDocumentId.value
      ? await repository.value.update(activeDocumentId.value, {
          ...input,
          expectedVersion: activeDocumentVersion.value,
        })
      : await repository.value.create(input);

    clearDraft(storageScope.value, previousDraftId);
    setActiveDocument(saved, storageScope.value);
    isDirty.value = false;
    await loadDocs();
    pushToast("Document saved", "success");
    return true;
  } catch (error) {
    const apiError = getApiError(error);
    if (apiError?.data?.code === "VERSION_CONFLICT" && apiError.data.currentDocument) {
      conflictDocument.value = apiError.data.currentDocument;
    } else {
      pushToast(getUserFacingError(error, "Unable to save the document. Try again."), "error");
    }
    return false;
  }
};

const removeCurrentDocument = async () => {
  if (!activeDocumentId.value) {
    clearDraft(storageScope.value, "new");
    resetDraft(storageScope.value);
    isDeleteOpen.value = false;
    pushToast("Draft cleared", "info");
    return;
  }

  try {
    await repository.value.remove(activeDocumentId.value);
    clearDraft(storageScope.value, activeDocumentId.value);
    resetDraft(storageScope.value);
    await loadDocs();
    isDeleteOpen.value = false;
    pushToast("Document deleted", "success");
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to delete the document. Try again."), "error");
  }
};

const newDocument = () => resetDraft(storageScope.value);

const openDocument = async (id: string) => {
  try {
    const document = await repository.value.get(id);
    setActiveDocument(document, storageScope.value);
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to open the document. Try again."), "error");
  }
};

const switchTheme = () => {
  const nextTheme = themeMode.value === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  pushToast(`Theme: ${nextTheme === "dark" ? "Dark" : "Light"}`, "info");
};

const toggleLayout = () => {
  layoutMode.value =
    layoutMode.value === "split"
      ? "editor"
      : layoutMode.value === "editor"
        ? "preview"
        : "split";
};

const setLayout = (mode: "split" | "editor" | "preview") => {
  layoutMode.value = mode;
};

const toggleZen = () => {
  zenMode.value = !zenMode.value;
};

const focusTitle = () => {
  titleInput.value?.focus();
  titleInput.value?.select();
};

const openPalette = async () => {
  paletteOpen.value = true;
  await nextTick();
  paletteInput.value?.focus();
};

const selectFromPalette = async (id: string) => {
  await openDocument(id);
  paletteOpen.value = false;
  paletteQuery.value = "";
  pushToast("File opened", "info");
};

const exportMarkdown = () => {
  const blob = new Blob([editorContent.value], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = asMarkdownFilename(documentTitle.value);
  link.click();
  URL.revokeObjectURL(link.href);
  pushToast("Exported .md", "success");
};

const downloadDraft = () => {
  exportMarkdown();
  pushToast("Your changes are still available", "info");
};

const exportHtml = () => {
  const safeTitle = documentTitle.value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${safeTitle}</title></head>
<body>${renderedHtml.value}</body>
</html>`;
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = asHtmlFilename(documentTitle.value);
  link.click();
  URL.revokeObjectURL(link.href);
  pushToast("Exported .html", "success");
};

const exportPdf = async () => {
  if (!previewRoot.value) {
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await pdf.html(previewRoot.value, {
    margin: [26, 26, 26, 26],
    autoPaging: "text",
    callback: (doc: { save: (name: string) => void }) =>
      doc.save(asPdfFilename(documentTitle.value)),
  });
  pushToast("Exported .pdf", "success");
};

const importFile = async (file: File) => {
  if (!file.name.endsWith(".md")) {
    pushToast("Only .md files are supported", "error");
    return;
  }
  const content = await file.text();
  updateTitle(normalizeTitle(file.name));
  updateEditor(content);
  activeDocumentId.value = "";
  activeDocumentVersion.value = 0;
  setDraftContext(storageScope.value, "new");
  isDraggingFile.value = false;
  pushToast("Markdown imported", "success");
};

const loadLocalImportCandidates = async () => {
  if (!user.value) {
    return;
  }
  localDocuments.value = await localDocs.getDocs();
  const stored = localStorage.getItem(importedIdsKey.value);
  try {
    const parsed = stored ? JSON.parse(stored) : [];
    importedLocalIds.value = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    importedLocalIds.value = [];
  }
  if (localDocuments.value.some((document) => !importedLocalIds.value.includes(document.id))) {
    importDialogOpen.value = true;
  }
};

const importSelectedDocuments = async (ids: string[]) => {
  importBusy.value = true;
  let imported = 0;
  let failed = 0;
  try {
    for (const id of ids) {
      const document = localDocuments.value.find((item) => item.id === id);
      if (!document) {
        continue;
      }
      try {
        const persisted = await importLocalDocument({
          localDocumentId: document.id,
          title: document.title,
          content: document.content,
          createdAt: document.createdAt,
        });
        if (persisted.title !== document.title || persisted.content !== document.content) {
          throw new Error("The imported document could not be verified");
        }
        if (!importedLocalIds.value.includes(id)) {
          importedLocalIds.value.push(id);
        }
        localStorage.setItem(importedIdsKey.value, JSON.stringify(importedLocalIds.value));
        imported += 1;
      } catch {
        failed += 1;
      }
    }
    await loadDocs();
    if (failed) {
      const remaining = failed === 1
        ? "1 document is still available on this device."
        : `${failed} documents are still available on this device.`;
      pushToast(`${imported} added to your account. ${remaining}`, "error");
    } else {
      pushToast(`${imported} ${imported === 1 ? "document" : "documents"} added to your account`, "success");
    }
  } finally {
    importBusy.value = false;
  }
};

const cleanupImportedDocuments = async (ids: string[]) => {
  if (!window.confirm("Remove these documents from this device? They will remain in your account.")) {
    return;
  }
  importBusy.value = true;
  await Promise.all(ids.map((id) => localDocs.deleteDoc(id)));
  localDocuments.value = await localDocs.getDocs();
  importBusy.value = false;
  pushToast("Documents removed from this device", "success");
};

const openPublicationDialog = async () => {
  if (!user.value || !activeDocumentId.value || isDirty.value) {
    return;
  }
  publicationBusy.value = true;
  publicationDialogOpen.value = true;
  try {
    publicationStatus.value = await $fetch<PublicationStatus>(
      `/api/documents/${activeDocumentId.value}/publication`,
    );
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to load sharing options. Try again."), "error");
    publicationDialogOpen.value = false;
  } finally {
    publicationBusy.value = false;
  }
};

const publishDocument = async () => {
  publicationBusy.value = true;
  try {
    publicationStatus.value = await $fetch<PublicationStatus>(
      `/api/documents/${activeDocumentId.value}/publication`,
      { method: "PUT", body: { expectedVersion: activeDocumentVersion.value } },
    );
    pushToast("Document shared", "success");
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to share the document. Try again."), "error");
  } finally {
    publicationBusy.value = false;
  }
};

const unpublishDocument = async () => {
  publicationBusy.value = true;
  try {
    await $fetch(`/api/documents/${activeDocumentId.value}/publication`, { method: "DELETE" });
    publicationStatus.value = {
      isPublished: false,
      publicToken: null,
      publicUrl: null,
      publishedAt: null,
      sourceVersion: null,
    };
    pushToast("Shared link disabled", "success");
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to disable the link. Try again."), "error");
  } finally {
    publicationBusy.value = false;
  }
};

const copyPublicationUrl = async () => {
  if (publicationStatus.value?.publicUrl) {
    await navigator.clipboard.writeText(publicationStatus.value.publicUrl);
    pushToast("Link copied", "success");
  }
};

const performSignOut = async (discardDraft = false) => {
  const scope = storageScope.value;
  if (discardDraft) {
    clearDraft(scope, activeDocumentId.value || "new");
  }
  try {
    await signOut();
    clearScopeDrafts(scope);
    resetDraft("guest");
    hydrateDraft("guest");
    await loadDocs();
    signOutDialogOpen.value = false;
    pushToast("Signed out. Documents on this device are still available.", "info");
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to sign out. Try again."), "error");
  }
};

const requestSignOut = () => {
  if (isDirty.value) {
    signOutDialogOpen.value = true;
    return;
  }
  void performSignOut();
};

const saveThenSignOut = async () => {
  if (await saveCurrentDocument()) {
    await performSignOut();
  }
};

const deleteAccount = async () => {
  if (deleteConfirmation.value !== "DELETE") {
    return;
  }
  accountBusy.value = true;
  const scope = storageScope.value;
  try {
    await $fetch("/api/account", {
      method: "DELETE",
      body: { confirmation: deleteConfirmation.value },
    });
    try {
      await signOut();
    } catch {
      user.value = null;
    }
    clearScopeDrafts(scope);
    deleteAccountOpen.value = false;
    deleteConfirmation.value = "";
    resetDraft("guest");
    hydrateDraft("guest");
    await loadDocs();
    pushToast("Account and documents deleted", "success");
  } catch (error) {
    pushToast(getUserFacingError(error, "Unable to delete the account. Try again."), "error");
  } finally {
    accountBusy.value = false;
  }
};

const reloadConflictVersion = () => {
  if (!conflictDocument.value) {
    return;
  }
  clearDraft(storageScope.value, activeDocumentId.value);
  setActiveDocument(conflictDocument.value, storageScope.value);
  conflictDocument.value = null;
  pushToast("Opened the latest version", "info");
};

const saveConflictAsCopy = async () => {
  conflictDocument.value = null;
  activeDocumentId.value = "";
  activeDocumentVersion.value = 0;
  setDraftContext(storageScope.value, "new");
  documentTitle.value = `${normalizeTitle(documentTitle.value)} copy`;
  await saveCurrentDocument();
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDraggingFile.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await importFile(file);
  }
};

watch([documentTitle, editorContent], () => cacheDraft());

watch(paletteOpen, async (open) => {
  if (open) {
    await nextTick();
    paletteInput.value?.focus();
  } else {
    paletteQuery.value = "";
  }
});

useKeyboardShortcuts({
  onSave: async () => {
    await saveCurrentDocument();
  },
  onDelete: () => (isDeleteOpen.value = true),
  onRename: focusTitle,
  onToggleLayout: toggleLayout,
  onToggleZen: toggleZen,
  onOpenPalette: openPalette,
});

onMounted(async () => {
  hydrateTheme();
  await initializeAuth();
  resetDraft(storageScope.value);
  hydrateDraft(storageScope.value);
  await loadDocs();
  if (user.value) {
    await loadLocalImportCandidates();
  }
});
</script>

<template>
  <div
    :class="['h-screen w-screen overflow-hidden', rootClass]"
    @dragenter.prevent="isDraggingFile = true"
    @dragover.prevent
    @dragleave.prevent="isDraggingFile = false"
    @drop="handleDrop"
  >
    <div
      v-if="isDraggingFile"
      class="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-xl"
    >
      <div :class="[surfaceClass, 'px-6 py-3 text-sm text-zinc-200']">Drop Markdown file to import</div>
    </div>

    <div class="flex h-full w-full">
      <DocumentLibrary
        v-if="!zenMode"
        v-model:search-query="searchQuery"
        v-model:collapsed="sidebarCollapsed"
        :documents="filteredDocuments"
        :active-document-id="activeDocumentId"
        :theme-mode="themeMode"
        :is-authenticated="Boolean(user)"
        :has-local-documents="localDocuments.length > 0"
        :border-class="borderClass"
        :surface-class="sidebarClass"
        :control-class="controlClass"
        :item-class="sidebarItemClass"
        :active-item-class="sidebarItemActiveClass"
        :muted-text-class="mutedTextClass"
        @create="newDocument"
        @open="openDocument"
        @theme="switchTheme"
        @palette="openPalette"
        @import="importDialogOpen = true"
      />

      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          v-if="!zenMode"
          :class="['flex h-12 items-center justify-between border-b px-3 md:px-4', borderClass, chromeClass]"
        >
          <div class="flex items-center gap-2">
            <button
              :class="[controlClass, 'h-8 w-8 p-0 text-zinc-400 md:hidden']"
              @click="mobileSidebarOpen = true"
            >
              =
            </button>
            <div class="flex flex-col gap-0.5">
              <label :class="['text-[10px] uppercase tracking-[0.14em]', mutedTextClass]">File name</label>
              <input
                ref="titleInput"
                :value="documentTitle"
                :class="['bg-transparent text-sm tracking-tight placeholder:opacity-70 focus:outline-none', strongTextClass]"
                placeholder="Untitled Document"
                @input="updateTitle(($event.target as HTMLInputElement).value)"
              />
            </div>
            <span :class="['text-xs', mutedTextClass]">{{ isDirty ? "Unsaved" : "Saved" }}</span>
          </div>

          <div class="flex items-center gap-2">
            <div :class="layoutSwitchClass">
              <button
                class="rounded px-2 py-1 text-xs transition-colors"
                :class="layoutButtonClass('editor')"
                @click="setLayout('editor')"
              >
                Editor
              </button>
              <button
                class="rounded px-2 py-1 text-xs transition-colors"
                :class="layoutButtonClass('split')"
                @click="setLayout('split')"
              >
                Split
              </button>
              <button
                class="rounded px-2 py-1 text-xs transition-colors"
                :class="layoutButtonClass('preview')"
                @click="setLayout('preview')"
              >
                Preview
              </button>
            </div>
            <button :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-300']" @click="toggleZen">Zen</button>
            <button
              v-if="user"
              :disabled="!activeDocumentId || isDirty"
              :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40']"
              :title="isDirty ? 'Save before sharing' : !activeDocumentId ? 'Save the document first' : 'Share the saved document by link'"
              @click="openPublicationDialog"
            >
              Share
            </button>
            <button :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-300']" @click="isDeleteOpen = true">Delete</button>
            <button :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-100']" @click="saveCurrentDocument">Save</button>
            <AccountControls
              :user="user"
              @sign-out="requestSignOut"
              @delete-account="deleteAccountOpen = true"
            />
          </div>
        </header>

        <section class="grid min-h-0 flex-1 gap-0" :class="layoutMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'">
          <section
            v-show="showEditorPane"
            :class="[
              'min-h-0 border-r',
              borderClass,
              editorPaneClass,
              layoutMode === 'editor' ? 'col-span-full' : ''
            ]"
          >
            <MarkdownEditorPane
              :model-value="editorContent"
              :is-dark="isDark"
              @update:model-value="updateEditor"
            />
          </section>

          <section
            v-show="showPreviewPane"
            ref="previewRoot"
            :class="[
              'min-h-0 overflow-y-auto px-5 py-6 leading-relaxed md:px-8',
              previewPaneClass,
              layoutMode === 'preview' ? 'col-span-full' : ''
            ]"
          >
            <article :class="proseClass" v-html="renderedHtml" />
          </section>
        </section>

        <footer
          v-if="!zenMode"
          :class="['flex h-11 items-center justify-between border-t px-3 text-xs md:px-4', borderClass, chromeClass, mutedTextClass]"
        >
          <div class="flex items-center gap-2">
            <button :class="[controlClass, 'px-2 py-1 text-[11px] text-zinc-300']" @click="exportMarkdown">
              .md
            </button>
            <button :class="[controlClass, 'px-2 py-1 text-[11px] text-zinc-300']" @click="exportHtml">
              .html
            </button>
            <button :class="[controlClass, 'px-2 py-1 text-[11px] text-zinc-300']" @click="exportPdf">
              .pdf
            </button>
          </div>
          <span class="hidden md:block">Cmd+S Save • Cmd+Backspace Delete • F2 Rename • Cmd+K Search</span>
        </footer>
      </main>
    </div>

    <div
      v-if="mobileSidebarOpen && !zenMode"
      class="fixed inset-0 z-40 md:hidden"
      @click.self="mobileSidebarOpen = false"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside :class="['absolute left-0 top-0 h-full w-64 border-r p-3', borderClass, sidebarClass]">
        <div class="mb-3 flex items-center justify-between">
          <p :class="['text-sm tracking-tight', strongTextClass]">Files</p>
          <button :class="[controlClass, 'h-8 w-8 p-0 text-zinc-400']" @click="mobileSidebarOpen = false">
            x
          </button>
        </div>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Find files..."
          :class="[controlClass, 'mb-3 w-full px-3 py-2 text-sm placeholder:text-zinc-500']"
        />
        <div class="space-y-1 overflow-y-auto">
          <button
            v-for="doc in filteredDocuments"
            :key="doc.id"
            :class="[sidebarItemClass, doc.id === activeDocumentId ? sidebarItemActiveClass : '']"
            @click="openDocument(doc.id); mobileSidebarOpen = false"
          >
            <span class="truncate tracking-tight">{{ doc.title }}</span>
          </button>
        </div>
      </aside>
    </div>

    <DialogRoot v-model:open="paletteOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/55 backdrop-blur-xl" />
        <DialogContent
          :class="[
            'fixed left-1/2 top-24 z-50 w-[92vw] max-w-2xl -translate-x-1/2 rounded-xl border p-3 focus:outline-none',
            isDark ? 'border-white/5 bg-zinc-900/80 text-zinc-100' : 'border-zinc-300 bg-white/90 text-zinc-900'
          ]"
        >
          <DialogTitle class="sr-only">Command palette</DialogTitle>
          <input
            ref="paletteInput"
            v-model="paletteQuery"
            placeholder="Search documents..."
            :class="['w-full border-none bg-transparent px-2 py-2 text-sm placeholder:text-zinc-500 focus:outline-none', strongTextClass]"
          />
          <div class="mt-2 max-h-[52vh] overflow-y-auto">
            <button
              v-for="doc in paletteResults"
              :key="doc.id"
              :class="[sidebarItemClass, 'w-full', doc.id === activeDocumentId ? sidebarItemActiveClass : '']"
              @click="selectFromPalette(doc.id)"
            >
              <span class="truncate">{{ doc.title }}</span>
            </button>
            <p v-if="paletteResults.length === 0" class="px-2 py-6 text-sm text-zinc-500">
              No matching file.
            </p>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <TransitionGroup
      tag="div"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex min-w-[220px] items-center justify-between rounded-md border px-3 py-2 text-xs backdrop-blur-xl animate-[bounce_0.45s_ease-out]',
          isDark ? 'border-white/5 bg-zinc-900/90 text-zinc-200' : 'border-zinc-300 bg-white/95 text-zinc-800'
        ]"
      >
        <span :class="toast.tone === 'error' ? 'text-rose-300' : toast.tone === 'success' ? 'text-emerald-300' : 'text-zinc-200'">
          {{ toast.title }}
        </span>
        <button class="ml-3 text-zinc-500 hover:text-zinc-200" @click="dismiss(toast.id)">x</button>
      </div>
    </TransitionGroup>

    <div v-if="zenMode" class="fixed right-4 top-4 z-50 flex gap-2">
      <button :class="[controlClass, 'px-3 py-2 text-xs text-zinc-200']" @click="toggleZen">Exit Zen</button>
      <button :class="[controlClass, 'px-3 py-2 text-xs text-zinc-200']" @click="openPalette">Cmd+K</button>
    </div>

    <div
      v-if="isDeleteOpen"
      class="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4 backdrop-blur-xl"
    >
      <div :class="['w-full max-w-sm rounded-md border p-4', isDark ? 'border-white/5 bg-zinc-900/80' : 'border-zinc-300 bg-white/95']">
        <h2 :class="['text-sm font-semibold tracking-tight', strongTextClass]">Delete this document?</h2>
        <p :class="['mt-2 text-sm', mutedTextClass]">This action cannot be undone.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button :class="[controlClass, 'px-3 py-2 text-xs text-zinc-300']" @click="isDeleteOpen = false">
            Cancel
          </button>
          <button :class="dangerButtonClass" @click="removeCurrentDocument">
            Delete document
          </button>
        </div>
      </div>
    </div>

    <ImportDocumentsDialog
      :open="importDialogOpen"
      :documents="localDocuments"
      :imported-ids="importedLocalIds"
      :busy="importBusy"
      @close="importDialogOpen = false"
      @import="importSelectedDocuments"
      @cleanup="cleanupImportedDocuments"
    />

    <PublicationDialog
      :open="publicationDialogOpen"
      :status="publicationStatus"
      :busy="publicationBusy"
      :has-remote-images="hasRemoteImages"
      @close="publicationDialogOpen = false"
      @publish="publishDocument"
      @unpublish="unpublishDocument"
      @copy="copyPublicationUrl"
    />

    <VersionConflictDialog
      :document="conflictDocument"
      @reload="reloadConflictVersion"
      @download="downloadDraft"
      @save-copy="saveConflictAsCopy"
      @close="conflictDocument = null"
    />

    <div v-if="signOutDialogOpen" class="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-xl">
      <section class="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-5 text-zinc-100 shadow-2xl">
        <h2 class="text-base font-semibold">Unsaved changes</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-400">Save or discard your changes before signing out.</p>
        <div class="mt-5 grid gap-2">
          <button class="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950" @click="saveThenSignOut">Save and sign out</button>
          <button class="rounded-md border border-rose-400/30 px-3 py-2 text-sm text-rose-300" @click="performSignOut(true)">Discard and sign out</button>
          <button class="px-3 py-2 text-xs text-zinc-500" @click="signOutDialogOpen = false">Cancel</button>
        </div>
      </section>
    </div>

    <div v-if="deleteAccountOpen" class="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-xl">
      <section class="w-full max-w-md rounded-xl border border-rose-400/20 bg-zinc-900 p-5 text-zinc-100 shadow-2xl">
        <h2 class="text-base font-semibold">Delete account permanently</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-400">
          This permanently deletes your account, its documents, and all shared links. This action cannot be undone.
        </p>
        <label for="delete-confirmation" class="mt-4 block text-xs text-zinc-300">Type DELETE to confirm</label>
        <input
          id="delete-confirmation"
          v-model="deleteConfirmation"
          autocomplete="off"
          class="mt-2 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-rose-400/50"
        />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-300" :disabled="accountBusy" @click="deleteAccountOpen = false; deleteConfirmation = ''">Cancel</button>
          <button class="rounded-md bg-rose-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" :disabled="accountBusy || deleteConfirmation !== 'DELETE'" @click="deleteAccount">
            {{ accountBusy ? "Deleting…" : "Delete account" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
