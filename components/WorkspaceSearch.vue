<script setup lang="ts">
import type { WorkspaceSearchResult } from "~/types/workspace";

const props = defineProps<{
  results: WorkspaceSearchResult[];
  indexedCount: number;
  fileCount: number;
}>();

const query = defineModel<string>({ required: true });

defineEmits<{ open: [result: WorkspaceSearchResult] }>();

const summary = computed(() => {
  if (!query.value.trim()) {
    return `${props.fileCount} files · ${props.indexedCount} indexed`;
  }
  const count = props.results.length;
  return count === 1 ? "1 match" : `${count} matches`;
});
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <div class="p-3">
      <label
        class="sr-only"
        for="workspace-search"
      >Search files and contents</label>
      <input
        id="workspace-search"
        v-model="query"
        class="w-full rounded-md border border-zinc-300 bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700"
        type="search"
        placeholder="Search files and contents"
        autocomplete="off"
      >
    </div>

    <p
      class="px-3 pb-2 text-xs text-zinc-500"
      aria-live="polite"
    >
      {{ summary }}
    </p>

    <ul
      v-if="query.trim()"
      class="min-h-0 flex-1 overflow-auto px-2 pb-2"
    >
      <li
        v-for="result in results"
        :key="`${result.path}:${result.line ?? 0}`"
      >
        <button
          class="w-full rounded-md px-2 py-1.5 text-left hover:bg-zinc-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:hover:bg-zinc-900"
          type="button"
          @click="$emit('open', result)"
        >
          <span class="block truncate text-sm">{{ result.name }}</span>
          <span class="block truncate text-xs text-zinc-500">
            {{ result.path }}<template v-if="result.line">:{{ result.line }}</template>
          </span>
          <span
            v-if="result.excerpt"
            class="mt-0.5 block truncate text-xs text-zinc-600 dark:text-zinc-400"
          >{{ result.excerpt }}</span>
        </button>
      </li>
      <li
        v-if="!results.length"
        class="px-2 py-1.5 text-sm text-zinc-500"
      >
        No matches. Indexing continues in the background.
      </li>
    </ul>
  </div>
</template>
