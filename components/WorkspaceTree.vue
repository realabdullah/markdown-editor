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
    :class="depth > 0 && 'ml-3 border-l border-line pl-2'"
  >
    <li
      v-for="child in folder.folders"
      :key="child.path"
    >
      <p class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
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
