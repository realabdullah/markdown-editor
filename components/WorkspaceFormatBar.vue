<script setup lang="ts">
import type { WorkspaceFormatCommand } from "~/types/workspace";

defineEmits<{ format: [command: WorkspaceFormatCommand] }>();

const groups: { label: string; buttons: { id: WorkspaceFormatCommand; glyph: string; label: string; shortcut?: string }[] }[] = [
  {
    label: "Text",
    buttons: [
      { id: "bold", glyph: "B", label: "Bold", shortcut: "Ctrl B" },
      { id: "italic", glyph: "I", label: "Italic", shortcut: "Ctrl I" },
      { id: "strike", glyph: "S", label: "Strikethrough" },
      { id: "code", glyph: "‹›", label: "Inline code" },
      { id: "link", glyph: "↗", label: "Link", shortcut: "Ctrl K" },
    ],
  },
  {
    label: "Headings",
    buttons: [
      { id: "h1", glyph: "H1", label: "Heading 1" },
      { id: "h2", glyph: "H2", label: "Heading 2" },
      { id: "h3", glyph: "H3", label: "Heading 3" },
    ],
  },
  {
    label: "Blocks",
    buttons: [
      { id: "bullet", glyph: "•", label: "Bullet list" },
      { id: "ordered", glyph: "1.", label: "Numbered list" },
      { id: "task", glyph: "☑", label: "Task list item" },
      { id: "quote", glyph: "❝", label: "Blockquote" },
      { id: "codeblock", glyph: "{ }", label: "Code block" },
      { id: "table", glyph: "▦", label: "Table" },
    ],
  },
];
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-1 border-b border-line px-3 py-1.5"
    role="toolbar"
    aria-label="Formatting"
  >
    <template
      v-for="(group, index) in groups"
      :key="group.label"
    >
      <span
        v-if="index > 0"
        class="mx-1 h-4 w-px bg-line"
        aria-hidden="true"
      />
      <button
        v-for="button in group.buttons"
        :key="button.id"
        class="min-w-8 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        type="button"
        :aria-label="button.label"
        :title="button.shortcut ? `${button.label} (${button.shortcut})` : button.label"
        @click="$emit('format', button.id)"
      >
        {{ button.glyph }}
      </button>
    </template>
  </div>
</template>
