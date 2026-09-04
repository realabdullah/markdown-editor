<script setup lang="ts">
import type { DocumentDetail } from "~/types";

defineProps<{ document: DocumentDetail | null }>();
const emit = defineEmits<{ reload: []; download: []; saveCopy: []; close: [] }>();
</script>

<template>
  <div v-if="document" class="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-xl">
    <section class="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-5 text-zinc-100 shadow-2xl">
      <h2 class="text-base font-semibold">This document changed elsewhere</h2>
      <p class="mt-2 text-sm leading-6 text-zinc-400">
        Your unsaved changes have not been replaced. Choose which version you want to keep.
      </p>
      <div class="mt-5 grid gap-2">
        <button class="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950" @click="emit('saveCopy')">Save my changes as a new document</button>
        <button class="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300" @click="emit('download')">Download my changes</button>
        <button class="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300" @click="emit('reload')">Discard my changes and open the latest version</button>
        <button class="px-3 py-2 text-xs text-zinc-500" @click="emit('close')">Keep editing for now</button>
      </div>
    </section>
  </div>
</template>
