<script setup lang="ts">
import type { MigrationSource } from "~/repositories/workspaceMigration";

defineProps<{
  localCount: number;
  accountCount: number;
  isSignedIn: boolean;
  isAccountConfigured: boolean;
  running: MigrationSource | "";
  statusMessage: string;
  errorMessage: string;
}>();

const emit = defineEmits<{
  importLocal: [];
  importAccount: [];
  signIn: [];
  dismiss: [];
}>();
</script>

<template>
  <section
    class="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60"
    aria-labelledby="workspace-migration-title"
  >
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      <div class="min-w-0 flex-1">
        <h2
          id="workspace-migration-title"
          class="text-sm font-medium"
        >
          Bring your earlier documents into this folder
        </h2>
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          They are copied into a dated import folder as <code>.md</code> files.
          The originals stay where they are.
        </p>
        <p
          v-if="statusMessage"
          class="mt-2 text-sm text-zinc-700 dark:text-zinc-300"
          role="status"
        >
          {{ statusMessage }}
        </p>
        <p
          v-if="errorMessage"
          class="mt-2 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {{ errorMessage }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="localCount"
          class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          type="button"
          :disabled="!!running"
          @click="emit('importLocal')"
        >
          {{
            running === "local"
              ? "Importing…"
              : `Import ${localCount} from this device`
          }}
        </button>

        <button
          v-if="isSignedIn && accountCount"
          class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          type="button"
          :disabled="!!running"
          @click="emit('importAccount')"
        >
          {{
            running === "account"
              ? "Importing…"
              : `Import ${accountCount} from your account`
          }}
        </button>

        <button
          v-else-if="isAccountConfigured && !isSignedIn"
          class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          type="button"
          :disabled="!!running"
          @click="emit('signIn')"
        >
          Sign in to import account documents
        </button>

        <button
          class="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
          @click="emit('dismiss')"
        >
          Dismiss
        </button>
      </div>
    </div>
  </section>
</template>
