<script setup lang="ts">
import type { PublicationStatus } from "~/types";

defineProps<{
  open: boolean;
  status: PublicationStatus | null;
  busy: boolean;
  copied: boolean;
  hasRemoteImages: boolean;
}>();
const emit = defineEmits<{ close: []; publish: []; unpublish: []; copy: [] }>();
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 backdrop-blur-xl">
    <section class="w-full max-w-md rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-zinc-100 shadow-2xl">
      <h2 class="text-base font-semibold tracking-tight">{{ status?.isPublished ? "Shared document" : "Share document" }}</h2>
      <p class="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Anyone with the link can read the saved document. Changes remain private until you share again.
      </p>
      <div v-if="hasRemoteImages" class="mt-4 rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
        Images from other websites may let those sites see a reader's IP address.
      </div>
      <div v-if="status?.publicUrl" class="mt-4 flex gap-2">
        <input :value="status.publicUrl" readonly class="min-w-0 flex-1 rounded-md border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400" />
        <button
          class="min-w-20 rounded-md border border-zinc-300 px-3 text-xs dark:border-white/10"
          @click="emit('copy')"
        >
          {{ copied ? "Copied" : "Copy link" }}
        </button>
      </div>
      <p v-if="status?.publishedAt" class="mt-2 text-xs text-zinc-500">Shared {{ new Date(status.publishedAt).toLocaleString() }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="rounded-md border border-zinc-300 dark:border-white/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300" :disabled="busy" @click="emit('close')">Close</button>
        <button v-if="status?.isPublished" class="rounded-md border border-rose-400/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300" :disabled="busy" @click="emit('unpublish')">Disable link</button>
        <button class="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-xs font-medium text-white dark:text-zinc-950 disabled:opacity-50" :disabled="busy" @click="emit('publish')">
          {{ busy ? "Sharing…" : status?.isPublished ? "Share latest changes" : "Share document" }}
        </button>
      </div>
    </section>
  </div>
</template>
