import type { DocumentDetail, DocumentSummary } from "~/types";

const DEFAULT_TEMPLATE = `# Welcome to your editor

Start writing markdown in the editor pane.

## Quick shortcuts
- Save: Ctrl/Cmd + S
- Rename: F2
- Delete: Ctrl + D (or Cmd + Backspace)

## Example
\`\`\`ts
const message = "Hello, markdown!";
console.log(message);
\`\`\`
`;

export type LayoutMode = "split" | "editor" | "preview";
export type SortMode = "updated" | "name";
export type PreviewStyle = "gfm" | "minimal";

export const useEditorState = () => {
  const documents = useState<DocumentSummary[]>("documents", () => []);
  const activeDocumentId = useState<string>("activeDocumentId", () => "");
  const activeDocumentVersion = useState<number>("activeDocumentVersion", () => 0);
  const editorContent = useState<string>("editorContent", () => DEFAULT_TEMPLATE);
  const documentTitle = useState<string>("documentTitle", () => "Untitled Document");
  const searchQuery = useState<string>("searchQuery", () => "");
  const sortMode = useState<SortMode>("sortMode", () => "updated");
  const themeMode = useState<"light" | "dark">("themeMode", () => "dark");
  const layoutMode = useState<LayoutMode>("layoutMode", () => "split");
  const previewStyle = useState<PreviewStyle>("previewStyle", () => "gfm");
  const zenMode = useState<boolean>("zenMode", () => false);
  const isDirty = useState<boolean>("isDirty", () => false);
  const isDeleteOpen = useState<boolean>("isDeleteOpen", () => false);

  const activeDocument = computed(() =>
    documents.value.find((doc) => doc.id === activeDocumentId.value),
  );

  const filteredDocuments = computed(() => {
    const term = searchQuery.value.trim().toLowerCase();
    let results = documents.value.filter((doc) =>
      doc.title.toLowerCase().includes(term),
    );

    if (sortMode.value === "name") {
      results = results.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      results = results.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    return results;
  });

  const applyTheme = (theme: "light" | "dark") => {
    themeMode.value = theme;
    if (!import.meta.client) {
      return;
    }
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("md-editor-theme", theme);
  };

  const hydrateTheme = () => {
    if (!import.meta.client) {
      return;
    }
    const cached = localStorage.getItem("md-editor-theme");
    if (cached === "light" || cached === "dark") {
      applyTheme(cached);
      return;
    }
    applyTheme(
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );
  };

  const draftScope = useState<string>("draftScope", () => "guest");
  const draftDocumentId = useState<string>("draftDocumentId", () => "new");
  let cacheTimer: ReturnType<typeof setTimeout> | null = null;

  const draftKey = (scope = draftScope.value, id = draftDocumentId.value) =>
    `md-editor-draft:${scope}:${id || "new"}`;

  const getCachedDraft = (scope: string, id: string) => {
    if (!import.meta.client) {
      return null;
    }
    const cached = localStorage.getItem(draftKey(scope, id));
    if (!cached) {
      return null;
    }
    try {
      return JSON.parse(cached) as { title: string; content: string };
    } catch {
      return null;
    }
  };

  const hydrateDraft = (scope: string, id = "new") => {
    if (!import.meta.client) {
      return;
    }
    draftScope.value = scope;
    draftDocumentId.value = id;
    const legacyDraft = scope === "guest" && id === "new"
      ? localStorage.getItem("md-editor-draft")
      : null;
    const cached = localStorage.getItem(draftKey(scope, id)) || legacyDraft;
    if (!cached) {
      return;
    }
    try {
      const payload = JSON.parse(cached) as { title: string; content: string };
      documentTitle.value = payload.title || "Untitled Document";
      editorContent.value = payload.content || DEFAULT_TEMPLATE;
      isDirty.value = true;
      if (legacyDraft) {
        localStorage.setItem(draftKey(scope, id), legacyDraft);
        localStorage.removeItem("md-editor-draft");
      }
    } catch {
      editorContent.value = DEFAULT_TEMPLATE;
    }
  };

  const cacheDraft = () => {
    if (!import.meta.client) {
      return;
    }
    if (cacheTimer) {
      clearTimeout(cacheTimer);
    }
    cacheTimer = setTimeout(() => {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({
          title: documentTitle.value,
          content: editorContent.value,
        }),
      );
    }, 300);
  };

  const clearDraft = (scope = draftScope.value, id = draftDocumentId.value) => {
    if (import.meta.client) {
      localStorage.removeItem(draftKey(scope, id));
    }
  };

  const clearScopeDrafts = (scope: string) => {
    if (!import.meta.client) {
      return;
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`md-editor-draft:${scope}:`))
      .forEach((key) => localStorage.removeItem(key));
  };

  const setDraftContext = (scope: string, id: string) => {
    draftScope.value = scope;
    draftDocumentId.value = id || "new";
  };

  const setActiveDocument = (doc: DocumentDetail, scope: string) => {
    activeDocumentId.value = doc.id;
    activeDocumentVersion.value = doc.version;
    setDraftContext(scope, doc.id);
    const cached = getCachedDraft(scope, doc.id);
    documentTitle.value = doc.title;
    editorContent.value = doc.content;
    if (cached) {
      documentTitle.value = cached.title || doc.title;
      editorContent.value = cached.content;
      isDirty.value = cached.title !== doc.title || cached.content !== doc.content;
    } else {
      isDirty.value = false;
    }
  };

  const resetDraft = (scope = draftScope.value) => {
    activeDocumentId.value = "";
    activeDocumentVersion.value = 0;
    setDraftContext(scope, "new");
    documentTitle.value = "Untitled Document";
    editorContent.value = DEFAULT_TEMPLATE;
    isDirty.value = false;
  };

  const updateEditor = (value: string) => {
    editorContent.value = value;
    isDirty.value = true;
    cacheDraft();
  };

  const updateTitle = (value: string) => {
    documentTitle.value = value;
    isDirty.value = true;
    cacheDraft();
  };

  return {
    documents,
    activeDocumentId,
    activeDocumentVersion,
    documentTitle,
    editorContent,
    searchQuery,
    sortMode,
    themeMode,
    layoutMode,
    previewStyle,
    zenMode,
    isDirty,
    isDeleteOpen,
    activeDocument,
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
  };
};
