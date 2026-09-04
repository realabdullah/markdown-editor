<script setup lang="ts">
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, type ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";

const props = defineProps<{
  modelValue: string;
  isDark: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const root = ref<HTMLElement | null>(null);
const themeCompartment = new Compartment();
let editor: EditorView | null = null;

const buildTheme = () =>
  EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "15px",
      fontFamily: "InterVariable, Inter, Geist, sans-serif",
      background: "transparent",
      color: props.isDark ? "rgb(250 250 250)" : "rgb(24 24 27)",
    },
    ".cm-content": {
      padding: "20px",
      minHeight: "100%",
      lineHeight: "1.75",
      caretColor: props.isDark ? "rgb(255 255 255)" : "rgb(24 24 27)",
    },
    ".cm-gutters": {
      borderRight: props.isDark
        ? "1px solid rgba(255,255,255,0.05)"
        : "1px solid rgba(39,39,42,0.15)",
      backgroundColor: "transparent",
      color: props.isDark ? "rgb(113 113 122)" : "rgb(82 82 91)",
    },
    ".cm-focused": { outline: "none" },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: props.isDark ? "rgb(255 255 255)" : "rgb(24 24 27)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: props.isDark
        ? "rgba(161, 161, 170, 0.2)"
        : "rgba(113, 113, 122, 0.22)",
    },
    ".cm-activeLineGutter": {
      background: "transparent",
      color: props.isDark ? "rgb(228 228 231)" : "rgb(39 39 42)",
    },
  });

onMounted(() => {
  if (!root.value) {
    return;
  }
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      EditorView.lineWrapping,
      themeCompartment.of(buildTheme()),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          emit("update:modelValue", update.state.doc.toString());
        }
      }),
    ],
  });
  editor = new EditorView({ state, parent: root.value });
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || editor.state.doc.toString() === value) {
      return;
    }
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  },
);

watch(
  () => props.isDark,
  () => {
    editor?.dispatch({
      effects: themeCompartment.reconfigure(buildTheme()),
    });
  },
);

onBeforeUnmount(() => editor?.destroy());
</script>

<template>
  <div ref="root" class="h-full min-h-0 overflow-hidden" />
</template>
