<script setup lang="ts">
const status = ref("Finishing sign-in…");
const failed = ref(false);
const { $supabase } = useNuxtApp();

onMounted(async () => {
  try {
    if (!$supabase) throw new Error("Sign-in is unavailable");
    // The browser client owns PKCE exchange; wait for it before reading the session.
    const { error: initializationError } = await $supabase.auth.initialize();
    if (initializationError) throw initializationError;
    const { data, error } = await $supabase.auth.getSession();
    if (error || !data.session) throw error || new Error("No session");
    await navigateTo("/", { replace: true });
  } catch {
    status.value = "Unable to finish signing in. Request a new link or try signing in again.";
    failed.value = true;
  }
});

useHead({ title: "Signing in · Markdown Editor", meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-white px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <div class="max-w-md space-y-4 text-center" role="status">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{{ status }}</p>
      <NuxtLink v-if="failed" to="/login" class="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-white/10">
        Back to sign in
      </NuxtLink>
    </div>
  </main>
</template>
