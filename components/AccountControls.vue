<script setup lang="ts">
import type { User } from "@supabase/supabase-js";

defineProps<{ user: User | null; disabled?: boolean }>();
const emit = defineEmits<{ signOut: []; deleteAccount: [] }>();
const open = ref(false);
</script>

<template>
  <NuxtLink
    v-if="!user"
    to="/login"
    class="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
  >
    Sign in
  </NuxtLink>
  <div v-else class="relative">
    <button
      class="max-w-36 truncate rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
      :disabled="disabled"
      @click="open = !open"
    >
      {{ user.email || "Account" }}
    </button>
    <div v-if="open" class="absolute right-0 top-10 z-30 w-48 rounded-md border border-white/10 bg-zinc-900 p-1 shadow-2xl">
      <button class="w-full rounded px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5" @click="open = false; emit('signOut')">
        Sign out
      </button>
      <button class="w-full rounded px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10" @click="open = false; emit('deleteAccount')">
        Delete account
      </button>
    </div>
  </div>
</template>
