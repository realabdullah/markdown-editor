import type { MarkdownDoc } from "~/types";

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
  const documents = useState<MarkdownDoc[]>("documents", () => []);
  const activeDocumentId = useState<string>("activeDocumentId", () => "");
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

  const hydrateDraft = () => {
    if (!import.meta.client) {
      return;
    }
    const cached = localStorage.getItem("md-editor-draft");
    if (!cached) {
      return;
    }
    try {
      const payload = JSON.parse(cached) as { title: string; content: string };
      documentTitle.value = payload.title || "Untitled Document";
      editorContent.value = payload.content || DEFAULT_TEMPLATE;
    } catch {
      editorContent.value = DEFAULT_TEMPLATE;
    }
  };

  const cacheDraft = () => {
    if (!import.meta.client) {
      return;
    }
    localStorage.setItem(
      "md-editor-draft",
      JSON.stringify({
        title: documentTitle.value,
        content: editorContent.value,
      }),
    );
  };

  const makeDocId = () => crypto.randomUUID();

  const setActiveDocument = (id: string) => {
    const doc = documents.value.find((item) => item.id === id);
    if (!doc) {
      return;
    }
    activeDocumentId.value = doc.id;
    documentTitle.value = doc.title;
    editorContent.value = doc.content;
    isDirty.value = false;
  };

  const resetDraft = () => {
    activeDocumentId.value = "";
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
    makeDocId,
    setActiveDocument,
    resetDraft,
    updateEditor,
    updateTitle,
  };
};
