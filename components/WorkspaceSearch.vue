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
        class="w-full rounded-md border border-line-strong bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        type="search"
        placeholder="Search files and contents"
        autocomplete="off"
      >
    </div>

    <p
      class="px-3 pb-2 text-xs text-ink-subtle"
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
          class="w-full rounded-md px-2 py-1.5 text-left hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          type="button"
          @click="$emit('open', result)"
        >
          <span class="block truncate text-sm">{{ result.name }}</span>
          <span class="block truncate text-xs text-ink-subtle">
            {{ result.path }}<template v-if="result.line">:{{ result.line }}</template>
          </span>
          <span
            v-if="result.excerpt"
            class="mt-0.5 block truncate text-xs text-ink-muted"
          >{{ result.excerpt }}</span>
        </button>
      </li>
      <li
        v-if="!results.length"
        class="px-2 py-1.5 text-sm text-ink-subtle"
      >
        No matches. Indexing continues in the background.
      </li>
    </ul>
  </div>
</template>
