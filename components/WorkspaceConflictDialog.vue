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
    <div class="flex max-h-full w-full max-w-4xl flex-col rounded-lg bg-panel shadow-panel">
      <header class="border-b border-line px-5 py-4">
        <h2
          id="workspace-conflict-title"
          class="text-lg font-semibold"
        >
          {{ conflict.path }} changed on disk
        </h2>
        <p class="mt-1 text-sm text-ink-muted">
          Your unsaved text and the file on disk have diverged. Nothing is written until you choose.
        </p>
      </header>

      <div class="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2">
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Your unsaved version
          </h3>
          <pre class="max-h-72 overflow-auto rounded-md bg-sunken p-3 text-xs leading-relaxed"><code>{{ conflict.localContent }}</code></pre>
        </section>
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Version on disk
          </h3>
          <pre class="max-h-72 overflow-auto rounded-md bg-sunken p-3 text-xs leading-relaxed"><code>{{ conflict.externalContent }}</code></pre>
        </section>
      </div>

      <footer class="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
        <button
          class="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          type="button"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          type="button"
          @click="$emit('reload')"
        >
          Discard mine, reload from disk
        </button>
        <button
          class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          type="button"
          @click="$emit('saveCopy')"
        >
          Save mine as a conflict copy
        </button>
      </footer>
    </div>
  </div>
</template>
