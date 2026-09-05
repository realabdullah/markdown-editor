<script setup lang="ts">
import type { WorkspaceConflict } from "~/types/workspace";

defineProps<{ conflict: WorkspaceConflict }>();

defineEmits<{ reload: []; saveCopy: []; cancel: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="workspace-conflict-title"
  >
    <div class="flex max-h-full w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-950">
      <header class="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2
          id="workspace-conflict-title"
          class="text-lg font-semibold"
        >
          {{ conflict.path }} changed on disk
        </h2>
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your unsaved text and the file on disk have diverged. Nothing is written until you choose.
        </p>
      </header>

      <div class="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2">
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Your unsaved version
          </h3>
          <pre class="max-h-72 overflow-auto rounded-md bg-zinc-100 p-3 text-xs leading-relaxed dark:bg-zinc-900"><code>{{ conflict.localContent }}</code></pre>
        </section>
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Version on disk
          </h3>
          <pre class="max-h-72 overflow-auto rounded-md bg-zinc-100 p-3 text-xs leading-relaxed dark:bg-zinc-900"><code>{{ conflict.externalContent }}</code></pre>
        </section>
      </div>

      <footer class="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <button
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
          type="button"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
          type="button"
          @click="$emit('reload')"
        >
          Discard mine, reload from disk
        </button>
        <button
          class="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:bg-zinc-100 dark:text-zinc-950"
          type="button"
          @click="$emit('saveCopy')"
        >
          Save mine as a conflict copy
        </button>
      </footer>
    </div>
  </div>
</template>
