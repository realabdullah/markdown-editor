<script setup lang="ts">
import type { WorkspaceFolder } from "~/types/workspace";

withDefaults(
  defineProps<{
    folder: WorkspaceFolder;
    activePath: string;
    selectedFolderPath?: string;
    depth?: number;
  }>(),
  { depth: 0, selectedFolderPath: "" },
);

const emit = defineEmits<{
  open: [path: string];
  selectFolder: [path: string];
  context: [event: MouseEvent, target: { kind: "folder" | "file"; path: string }];
}>();

const forwardContext = (
  event: MouseEvent,
  target: { kind: "folder" | "file"; path: string },
) => emit("context", event, target);
</script>

<template>
  <ul
    class="space-y-0.5"
    :class="depth > 0 && 'ml-3 border-l border-line pl-2'"
  >
    <li
      v-for="child in folder.folders"
      :key="child.path"
    >
      <button
        class="w-full rounded-md px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :class="child.path === selectedFolderPath && 'bg-raised text-ink'"
        type="button"
        @click="$emit('selectFolder', child.path)"
        @contextmenu.prevent="$emit('context', $event, { kind: 'folder', path: child.path })"
      >
        {{ child.name }}
      </button>
      <WorkspaceTree
        :folder="child"
        :active-path="activePath"
        :selected-folder-path="selectedFolderPath"
        :depth="depth + 1"
        @open="$emit('open', $event)"
        @select-folder="$emit('selectFolder', $event)"
        @context="forwardContext"
      />
    </li>

    <li
      v-for="file in folder.files"
      :key="file.path"
    >
      <button
        class="w-full truncate rounded-md px-2 py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :class="
          file.path === activePath
            ? 'bg-raised font-medium'
            : 'hover:bg-raised'
        "
        type="button"
        :aria-current="file.path === activePath ? 'true' : undefined"
        :title="file.path"
        @click="$emit('open', file.path)"
        @contextmenu.prevent="$emit('context', $event, { kind: 'file', path: file.path })"
      >
        {{ file.name }}
        <span
          v-if="file.indexStatus === 'excluded'"
          class="ml-1 text-xs font-normal text-ink-subtle"
          title="Too large to index for search"
        >(not indexed)</span>
      </button>
    </li>
  </ul>
</template>
