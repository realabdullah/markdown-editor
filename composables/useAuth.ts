import type { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const { $supabase } = useNuxtApp();
  const config = useRuntimeConfig();
  const user = useState<User | null>("auth-user", () => null);
  const isAuthReady = useState<boolean>("auth-ready", () => false);
  const authSubscriptionStarted = useState<boolean>(
    "auth-subscription-started",
    () => false,
  );

  const initialize = async () => {
    if (isAuthReady.value) return;
    if (!$supabase) {
      user.value = null;
      isAuthReady.value = true;
      return;
    }

    if (!authSubscriptionStarted.value) {
      authSubscriptionStarted.value = true;
      $supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user || null;
      });
    }
    try {
      await $supabase.auth.initialize();
      const { data } = await $supabase.auth.getSession();
      user.value = data.session?.user || null;
    } finally {
      isAuthReady.value = true;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    if (!$supabase) {
      throw new Error("Supabase is not configured");
    }
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await $supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!$supabase) {
      throw new Error("Supabase is not configured");
    }
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await $supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    if ($supabase) {
      const { error } = await $supabase.auth.signOut({ scope: "global" });
      if (error) {
        throw error;
      }
    }
    user.value = null;
  };

  return {
    user,
    isAuthReady,
    isConfigured: computed(() => Boolean(config.public.supabaseUrl && config.public.supabasePublishableKey)),
    initialize,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
  };
};
