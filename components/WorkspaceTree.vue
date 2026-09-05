<script setup lang="ts">
import type { WorkspaceFolder } from "~/types/workspace";

withDefaults(
  defineProps<{
    folder: WorkspaceFolder;
    activePath: string;
    depth?: number;
  }>(),
  { depth: 0 },
);

defineEmits<{ open: [path: string] }>();
</script>

<template>
  <ul
    class="space-y-0.5"
    :class="depth > 0 && 'ml-3 border-l border-zinc-200 pl-2 dark:border-zinc-800'"
  >
    <li
      v-for="child in folder.folders"
      :key="child.path"
    >
      <p class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {{ child.name }}
      </p>
      <WorkspaceTree
        :folder="child"
        :active-path="activePath"
        :depth="depth + 1"
        @open="$emit('open', $event)"
      />
    </li>

    <li
      v-for="file in folder.files"
      :key="file.path"
    >
      <button
        class="w-full truncate rounded-md px-2 py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        :class="
          file.path === activePath
            ? 'bg-zinc-200 font-medium dark:bg-zinc-800'
            : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-900'
        "
        type="button"
        :aria-current="file.path === activePath ? 'true' : undefined"
        :title="file.path"
        @click="$emit('open', file.path)"
      >
        {{ file.name }}
        <span
          v-if="file.indexStatus === 'excluded'"
          class="ml-1 text-xs font-normal text-zinc-500"
          title="Too large to index for search"
        >(not indexed)</span>
      </button>
    </li>
  </ul>
</template>
