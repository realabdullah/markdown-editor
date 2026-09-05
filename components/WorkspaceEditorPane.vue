<script setup lang="ts">
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type ViewUpdate,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { toRelativePath } from "~/repositories/workspacePaths";
import { createEchoGuard } from "~/utils/scrollSync";
import {
  insertCodeBlock,
  insertLink,
  insertTable,
  toggleBlockquote,
  toggleBulletList,
  toggleHeading,
  toggleInlineMarker,
  toggleOrderedList,
  toggleTaskItem,
  type FormatResult,
} from "~/utils/markdownFormatting";
import type { WorkspaceFormatCommand } from "~/types/workspace";

const props = defineProps<{
  modelValue: string;
  isDark: boolean;
  documentPath: string;
  assetPaths: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  cursor: [position: { line: number; column: number; selected: number }];
  "scroll-line": [line: number];
  /** The line the outline should mark — not always the line being scrolled to. */
  place: [line: number];
  save: [];
}>();

const root = ref<HTMLElement | null>(null);
const themeCompartment = new Compartment();
let editor: EditorView | null = null;
let scrollFrame = 0;
const echo = createEchoGuard();

const buildTheme = () =>
  EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "15px",
        background: "transparent",
        color: props.isDark ? "rgb(244 244 245)" : "rgb(24 24 27)",
      },
      ".cm-scroller": {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
        lineHeight: "1.75",
      },
      ".cm-content": {
        padding: "24px 0 40vh",
        maxWidth: "72ch",
        margin: "0 auto",
        caretColor: props.isDark ? "rgb(255 255 255)" : "rgb(24 24 27)",
      },
      ".cm-gutters": {
        border: "none",
        backgroundColor: "transparent",
        color: props.isDark ? "rgb(82 82 91)" : "rgb(161 161 170)",
      },
      ".cm-activeLine": { backgroundColor: "transparent" },
      ".cm-activeLineGutter": {
        background: "transparent",
        color: props.isDark ? "rgb(212 212 216)" : "rgb(63 63 70)",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: props.isDark ? "rgb(255 255 255)" : "rgb(24 24 27)",
        borderLeftWidth: "2px",
      },
      ".cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: props.isDark
          ? "rgba(161, 161, 170, 0.28)"
          : "rgba(113, 113, 122, 0.22)",
      },
      ".cm-panels": {
        backgroundColor: props.isDark ? "rgb(24 24 27)" : "rgb(244 244 245)",
        color: "inherit",
        borderTop: props.isDark
          ? "1px solid rgb(39 39 42)"
          : "1px solid rgb(228 228 231)",
      },
      ".cm-panel input, .cm-panel button": {
        fontFamily: "inherit",
      },
    },
    { dark: props.isDark },
  );

/** Offers workspace image assets while typing a Markdown link or image target. */
const completeAssetPath = (context: CompletionContext) => {
  const typed = context.matchBefore(/\]\(([^)\s]*)$/);
  if (!typed || (typed.from === typed.to && !context.explicit)) return null;

  const prefixLength = typed.text.indexOf("(") + 1;
  return {
    from: typed.from + prefixLength,
    options: props.assetPaths.map((path) => ({
      label: toRelativePath(props.documentPath, path),
      detail: "image",
      type: "text",
    })),
    validFor: /^[^)\s]*$/,
  };
};

const reportCursor = (view: EditorView) => {
  const range = view.state.selection.main;
  const line = view.state.doc.lineAt(range.head);
  emit("cursor", {
    line: line.number,
    column: range.head - line.from + 1,
    selected: range.to - range.from,
  });
  // Moving the caret always scrolls it into view, so it is where the reader is.
  emit("place", line.number);
};

/**
 * The offset between the scroller's `scrollTop` and CodeMirror's own document
 * coordinates. Both move together, so the difference is constant for a given
 * layout and converts freely between the two.
 */
const documentOffset = (view: EditorView) =>
  view.scrollDOM.scrollTop -
  (view.scrollDOM.getBoundingClientRect().top - view.documentTop);

/**
 * The source line at the top of the viewport, including the fraction of it that
 * has scrolled past. Reporting whole lines only would make the preview advance
 * in visible steps rather than track the text continuously.
 */
const visibleLine = (view: EditorView) => {
  const height = view.scrollDOM.scrollTop - documentOffset(view);
  const block = view.lineBlockAtHeight(height);
  const line = view.state.doc.lineAt(block.from).number;
  const progress = block.height > 0 ? (height - block.top) / block.height : 0;
  return line + Math.min(Math.max(progress, 0), 1);
};

/**
 * Where the reader's attention is, which is not the same as what is scrolled to.
 * While the caret is on screen it is the answer, so a caret jump is not undone
 * by the scroll it causes; once it has been scrolled away from, the top of the
 * viewport takes over.
 */
const placeLine = (view: EditorView) => {
  const top = view.scrollDOM.scrollTop - documentOffset(view);
  const bottom = top + view.scrollDOM.clientHeight;
  const caret = view.lineBlockAt(view.state.selection.main.head);

  return caret.bottom > top && caret.top < bottom
    ? view.state.doc.lineAt(view.state.selection.main.head).number
    : visibleLine(view);
};

const onScrollerScroll = () => {
  const view = editor;
  if (!view || echo.isEcho(view.scrollDOM.scrollTop) || scrollFrame) return;

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (!editor) return;
    emit("scroll-line", visibleLine(editor));
    emit("place", placeLine(editor));
  });
};

type Transform = (text: string, from: number, to: number) => FormatResult;

const TRANSFORMS: Record<WorkspaceFormatCommand, Transform> = {
  bold: (text, from, to) => toggleInlineMarker(text, from, to, "**"),
  italic: (text, from, to) => toggleInlineMarker(text, from, to, "*"),
  strike: (text, from, to) => toggleInlineMarker(text, from, to, "~~"),
  code: (text, from, to) => toggleInlineMarker(text, from, to, "`"),
  link: insertLink,
  h1: (text, from, to) => toggleHeading(text, from, to, 1),
  h2: (text, from, to) => toggleHeading(text, from, to, 2),
  h3: (text, from, to) => toggleHeading(text, from, to, 3),
  bullet: toggleBulletList,
  ordered: toggleOrderedList,
  task: toggleTaskItem,
  quote: toggleBlockquote,
  codeblock: insertCodeBlock,
  table: (text, from) => insertTable(text, from),
};

/** Runs a pure formatting transform over the current selection. */
const applyFormat = (command: WorkspaceFormatCommand) => {
  if (!editor) return;
  const { from, to } = editor.state.selection.main;
  const result = TRANSFORMS[command](editor.state.doc.toString(), from, to);
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: result.text },
    selection: { anchor: result.from, head: result.to },
  });
  editor.focus();
};

const formatKey = (key: string, command: WorkspaceFormatCommand) => ({
  key,
  preventDefault: true,
  run: () => {
    applyFormat(command);
    return true;
  },
});

onMounted(() => {
  if (!root.value) return;

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      history(),
      closeBrackets(),
      search({ top: true }),
      highlightSelectionMatches(),
      autocompletion({ override: [completeAssetPath] }),
      keymap.of([
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            emit("save");
            return true;
          },
        },
        formatKey("Mod-b", "bold"),
        formatKey("Mod-i", "italic"),
        formatKey("Mod-Shift-k", "link"),
        formatKey("Mod-Shift-x", "strike"),
        ...closeBracketsKeymap,
        ...searchKeymap,
        ...completionKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      themeCompartment.of(buildTheme()),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          emit("update:modelValue", update.state.doc.toString());
        }
        if (update.docChanged || update.selectionSet) {
          reportCursor(update.view);
        }
      }),
    ],
  });

  editor = new EditorView({ state, parent: root.value });
  // Scroll does not bubble, so it is listened for on the scroller itself.
  editor.scrollDOM.addEventListener("scroll", onScrollerScroll, { passive: true });
  reportCursor(editor);
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  },
);

watch(
  () => props.isDark,
  () => {
    editor?.dispatch({ effects: themeCompartment.reconfigure(buildTheme()) });
  },
);

onBeforeUnmount(() => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  editor?.scrollDOM.removeEventListener("scroll", onScrollerScroll);
  editor?.destroy();
});

const focusEditor = () => editor?.focus();

const openFind = () => {
  if (!editor) return;
  editor.focus();
  openSearchPanel(editor);
};

/**
 * Scrolls a — possibly fractional — source line to the top of the viewport.
 * Setting `scrollTop` directly keeps the movement continuous; CodeMirror's own
 * `scrollIntoView` snaps to line boundaries, which reads as a stutter when the
 * preview is driving.
 */
const revealLine = (line: number, focus = false) => {
  const view = editor;
  if (!view) return;

  const clamped = Math.min(Math.max(line, 1), view.state.doc.lines);
  const target = view.state.doc.line(Math.floor(clamped));
  const block = view.lineBlockAt(target.from);
  const height = block.top + (clamped - Math.floor(clamped)) * block.height;

  view.scrollDOM.scrollTop = height + documentOffset(view);
  echo.record(view.scrollDOM.scrollTop);

  if (focus) {
    view.dispatch({ selection: { anchor: target.from } });
    view.focus();
  }
};

defineExpose({ applyFormat, focusEditor, openFind, revealLine });
</script>

<template>
  <div
    ref="root"
    class="h-full min-h-0 overflow-hidden"
  />
</template>
