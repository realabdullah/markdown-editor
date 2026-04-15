<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, type ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { useEditorState } from "../composables/useEditorState";
import { useMdDocs } from "../composables/useIdb";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import { useMarkdown } from "../composables/useMarkdown";
import { useToasts } from "../composables/useToasts";
import type { MarkdownDoc } from "../types";

const {
  documents,
  activeDocumentId,
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
  makeDocId,
  setActiveDocument,
  resetDraft,
  updateEditor,
  updateTitle,
} = useEditorState();

const { getDocs, saveDoc, deleteDoc } = useMdDocs();
const { renderMarkdown } = useMarkdown();
const { toasts, push: pushToast, dismiss } = useToasts();

const titleInput = ref<HTMLInputElement | null>(null);
const paletteInput = ref<HTMLInputElement | null>(null);
const previewRoot = ref<HTMLElement | null>(null);
const editorRoot = ref<HTMLElement | null>(null);
const isDraggingFile = ref(false);
const sidebarCollapsed = ref(false);
const mobileSidebarOpen = ref(false);
const paletteOpen = ref(false);
const paletteQuery = ref("");
let editorView: EditorView | null = null;
const editorThemeCompartment = new Compartment();

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

const loadDocs = async () => {
  documents.value = await getDocs();
};

const saveCurrentDocument = async () => {
  const now = new Date().toISOString();
  const currentId = activeDocumentId.value || makeDocId();
  const existingDoc = documents.value.find((item) => item.id === currentId);
  const doc: MarkdownDoc = {
    id: currentId,
    title: normalizeTitle(documentTitle.value),
    content: editorContent.value,
    createdAt: existingDoc?.createdAt || now,
    updatedAt: now,
  };

  await saveDoc(doc);
  activeDocumentId.value = currentId;
  isDirty.value = false;
  await loadDocs();
  pushToast("Document saved", "success");
};

const removeCurrentDocument = async () => {
  if (!activeDocumentId.value) {
    resetDraft();
    isDeleteOpen.value = false;
    pushToast("Draft cleared", "info");
    return;
  }

  await deleteDoc(activeDocumentId.value);
  resetDraft();
  await loadDocs();
  isDeleteOpen.value = false;
  pushToast("Document deleted", "success");
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

const selectFromPalette = (id: string) => {
  setActiveDocument(id);
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

const exportHtml = () => {
  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${documentTitle.value}</title></head>
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
  isDraggingFile.value = false;
  pushToast("Markdown imported", "success");
};

const buildEditorTheme = () =>
  EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "15px",
      fontFamily: "InterVariable, Inter, Geist, sans-serif",
      background: "transparent",
      color: isDark.value ? "rgb(250 250 250)" : "rgb(24 24 27)",
    },
    ".cm-content": {
      padding: "20px",
      minHeight: "100%",
      lineHeight: "1.75",
      caretColor: isDark.value ? "rgb(255 255 255)" : "rgb(24 24 27)",
    },
    ".cm-gutters": {
      borderRight: isDark.value
        ? "1px solid rgba(255,255,255,0.05)"
        : "1px solid rgba(39,39,42,0.15)",
      backgroundColor: "transparent",
      color: isDark.value ? "rgb(113 113 122)" : "rgb(82 82 91)",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: isDark.value ? "rgb(255 255 255)" : "rgb(24 24 27)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: isDark.value
        ? "rgba(161, 161, 170, 0.2)"
        : "rgba(113, 113, 122, 0.22)",
    },
    ".cm-activeLineGutter": {
      background: "transparent",
      color: isDark.value ? "rgb(228 228 231)" : "rgb(39 39 42)",
    },
  });

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDraggingFile.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await importFile(file);
  }
};

const mountEditor = () => {
  if (!editorRoot.value) {
    return;
  }

  const state = EditorState.create({
    doc: editorContent.value,
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      EditorView.lineWrapping,
      editorThemeCompartment.of(buildEditorTheme()),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          updateEditor(update.state.doc.toString());
        }
      }),
    ],
  });

  editorView = new EditorView({ state, parent: editorRoot.value });
};

watch(editorContent, (value) => {
  if (!editorView) {
    return;
  }
  const current = editorView.state.doc.toString();
  if (current === value) {
    return;
  }
  editorView.dispatch({ changes: { from: 0, to: current.length, insert: value } });
});

watch([documentTitle, editorContent], () => cacheDraft());
watch(isDark, () => {
  if (!editorView) {
    return;
  }
  editorView.dispatch({
    effects: editorThemeCompartment.reconfigure(buildEditorTheme()),
  });
});

watch(paletteOpen, async (open) => {
  if (open) {
    await nextTick();
    paletteInput.value?.focus();
  } else {
    paletteQuery.value = "";
  }
});

useKeyboardShortcuts({
  onSave: saveCurrentDocument,
  onDelete: () => (isDeleteOpen.value = true),
  onRename: focusTitle,
  onToggleLayout: toggleLayout,
  onToggleZen: toggleZen,
  onOpenPalette: openPalette,
});

onMounted(async () => {
  hydrateTheme();
  hydrateDraft();
  await loadDocs();
  mountEditor();
});

onBeforeUnmount(() => editorView?.destroy());
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
      <aside
        v-if="!zenMode"
        :class="[
          'hidden h-full border-r transition-all duration-300 md:flex md:flex-col',
          borderClass,
          sidebarClass,
          sidebarCollapsed ? 'w-16' : 'w-64'
        ]"
      >
        <div :class="['flex h-12 items-center justify-between border-b px-3', borderClass]">
          <button
            :class="[controlClass, 'h-8 w-8 bg-zinc-800/30 p-0 text-zinc-400 hover:text-zinc-100']"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <span class="sr-only">Toggle sidebar</span>
            {{ sidebarCollapsed ? ">" : "<" }}
          </button>
          <button
            v-if="!sidebarCollapsed"
            :class="[controlClass, 'px-2 py-1 text-xs tracking-tight text-zinc-200']"
            @click="resetDraft"
          >
            New
          </button>
        </div>

        <div v-if="!sidebarCollapsed" class="flex h-full flex-col gap-3 px-3 py-3">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Find files..."
            :class="[controlClass, 'px-3 py-2 text-sm placeholder:text-zinc-500']"
          />
          <div class="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="doc in filteredDocuments"
              :key="doc.id"
              :class="[sidebarItemClass, doc.id === activeDocumentId ? sidebarItemActiveClass : '']"
              @click="setActiveDocument(doc.id)"
            >
              <span class="truncate tracking-tight">{{ doc.title }}</span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button :class="[controlClass, 'px-2 py-2 text-xs text-zinc-300']" @click="switchTheme">
              {{ themeMode === "dark" ? "Light" : "Dark" }}
            </button>
            <button :class="[controlClass, 'px-2 py-2 text-xs text-zinc-300']" @click="openPalette">
              Cmd+K
            </button>
          </div>
        </div>
      </aside>

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
            <button :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-300']" @click="isDeleteOpen = true">Delete</button>
            <button :class="[controlClass, 'px-3 py-1.5 text-xs text-zinc-100']" @click="saveCurrentDocument">Save</button>
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
            <div ref="editorRoot" class="h-full min-h-0 overflow-hidden" />
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
            @click="setActiveDocument(doc.id); mobileSidebarOpen = false"
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
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
