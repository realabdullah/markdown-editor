<script setup lang="ts">
const email = ref("");
const message = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);
const { user, isConfigured, initialize, signInWithGoogle, signInWithMagicLink } = useAuth();

onMounted(async () => {
  await initialize();
  if (user.value) {
    await navigateTo("/");
  }
});

const sendMagicLink = async () => {
  errorMessage.value = "";
  message.value = "";
  isSubmitting.value = true;
  try {
    await signInWithMagicLink(email.value);
    message.value = "Check your email for a secure sign-in link.";
  } catch {
    errorMessage.value = "Unable to send a sign-in link. Check your email address and try again.";
  } finally {
    isSubmitting.value = false;
  }
};

const continueWithGoogle = async () => {
  errorMessage.value = "";
  isSubmitting.value = true;
  try {
    await signInWithGoogle();
  } catch {
    errorMessage.value = "Unable to sign in with Google. Try again.";
    isSubmitting.value = false;
  }
};

useHead({ title: "Sign in · Markdown Editor", meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100">
    <section class="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl">
      <NuxtLink to="/" class="text-xs text-zinc-400 hover:text-zinc-100">← Continue without signing in</NuxtLink>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Save across devices</h1>
      <p class="mt-2 text-sm leading-6 text-zinc-400">
        Sign in to access your documents on other devices and share them by link.
      </p>

      <div v-if="!isConfigured" class="mt-6 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
        Sign-in is unavailable right now. You can continue without signing in.
      </div>

      <form v-else class="mt-6 space-y-3" @submit.prevent="sendMagicLink">
        <label class="block text-xs font-medium text-zinc-300" for="email">Email address</label>
        <input
          id="email"
          v-model="email"
          required
          type="email"
          autocomplete="email"
          class="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          Email me a sign-in link
        </button>
        <div class="flex items-center gap-3 py-1 text-xs text-zinc-600">
          <span class="h-px flex-1 bg-white/10" /> or <span class="h-px flex-1 bg-white/10" />
        </div>
        <button
          type="button"
          :disabled="isSubmitting"
          class="w-full rounded-md border border-white/10 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          @click="continueWithGoogle"
        >
          Continue with Google
        </button>
      </form>

      <p v-if="message" class="mt-4 text-sm text-emerald-300">{{ message }}</p>
      <p v-if="errorMessage" class="mt-4 text-sm text-rose-300">{{ errorMessage }}</p>
      <p class="mt-6 text-xs leading-5 text-zinc-500">
        Documents already on this device stay here until you choose to add them to your account.
      </p>
    </section>
  </main>
</template>
