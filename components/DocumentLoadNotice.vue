<script setup lang="ts">
defineProps<{
  error: { message: string; requiresSignIn: boolean } | null;
  loading: boolean;
}>();

defineEmits<{
  retry: [];
  'sign-in': [];
}>();
</script>

<template>
  <div
    v-if="error"
    role="alert"
    class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
  >
    <div>
      <p class="font-medium">
        Documents couldn’t be loaded
      </p>
      <p class="mt-1">
        {{ error.message }}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-3">
      <button
        v-if="error.requiresSignIn"
        type="button"
        class="rounded border border-current px-3 py-1.5 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        @click="$emit('sign-in')"
      >
        Sign in again
      </button>
      <button
        type="button"
        :disabled="loading"
        class="rounded px-2 py-1.5 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        @click="$emit('retry')"
      >
        {{ loading ? 'Retrying…' : 'Try again' }}
      </button>
    </div>
  </div>
  <p
    v-else-if="loading"
    role="status"
    class="shrink-0 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
  >
    Loading your documents…
  </p>
</template>
