<script setup lang="ts">
const status = ref("Finishing sign-in…");
const { $supabase } = useNuxtApp();

onMounted(async () => {
  const code = new URL(window.location.href).searchParams.get("code");
  if (!$supabase || !code) {
    status.value = "This sign-in link is invalid or has expired. Request a new link and try again.";
    return;
  }
  const { error } = await $supabase.auth.exchangeCodeForSession(code);
  if (error) {
    status.value = "Unable to sign in with this link. Request a new link and try again.";
    return;
  }
  await navigateTo("/", { replace: true });
});

useHead({ title: "Signing in · Markdown Editor", meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100">
    <p class="text-sm text-zinc-400">{{ status }}</p>
  </main>
</template>
