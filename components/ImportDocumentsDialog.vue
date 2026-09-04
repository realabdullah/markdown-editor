<script setup lang="ts">
import type { DocumentDetail } from "~/types";

const props = defineProps<{
  open: boolean;
  documents: DocumentDetail[];
  importedIds: string[];
  busy: boolean;
}>();
const emit = defineEmits<{
  close: [];
  import: [ids: string[]];
  cleanup: [ids: string[]];
}>();
const selectedIds = ref<string[]>([]);
const pendingDocuments = computed(() =>
  props.documents.filter((document) => !props.importedIds.includes(document.id)),
);
const importedDocuments = computed(() =>
  props.documents.filter((document) => props.importedIds.includes(document.id)),
);

watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedIds.value = pendingDocuments.value.map((document) => document.id);
    }
  },
);
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-xl">
    <section class="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-5 text-zinc-100 shadow-2xl">
      <h2 class="text-base font-semibold tracking-tight">Add documents to your account</h2>
      <p class="mt-2 text-sm leading-6 text-zinc-400">
        Choose the documents you want to access when you sign in. They will remain on this device too.
      </p>
      <div class="mt-4 max-h-64 space-y-1 overflow-y-auto">
        <label v-for="document in pendingDocuments" :key="document.id" class="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/5">
          <input v-model="selectedIds" type="checkbox" :value="document.id" />
          <span class="truncate text-sm">{{ document.title }}</span>
        </label>
        <p v-if="pendingDocuments.length === 0" class="py-5 text-sm text-zinc-500">All documents on this device are already in your account.</p>
      </div>
      <div v-if="importedDocuments.length" class="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3">
        <p class="text-xs text-emerald-200">{{ importedDocuments.length }} {{ importedDocuments.length === 1 ? 'document is' : 'documents are' }} now available in your account.</p>
        <button class="mt-2 text-xs text-zinc-300 underline" :disabled="busy" @click="emit('cleanup', importedDocuments.map((document) => document.id))">
          Remove from this device
        </button>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <button class="rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-300" :disabled="busy" @click="emit('close')">Not now</button>
        <button class="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 disabled:opacity-50" :disabled="busy || selectedIds.length === 0" @click="emit('import', selectedIds)">
          {{ busy ? "Adding…" : `Add ${selectedIds.length}` }}
        </button>
      </div>
    </section>
  </div>
</template>
