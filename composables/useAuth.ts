import type { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const { $supabase } = useNuxtApp();
  const user = useState<User | null>("auth-user", () => null);
  const isAuthReady = useState<boolean>("auth-ready", () => false);
  const authSubscriptionStarted = useState<boolean>(
    "auth-subscription-started",
    () => false,
  );

  const initialize = async () => {
    if (!$supabase) {
      user.value = null;
      isAuthReady.value = true;
      return;
    }

    const { data } = await $supabase.auth.getUser();
    user.value = data.user;
    isAuthReady.value = true;

    if (!authSubscriptionStarted.value) {
      authSubscriptionStarted.value = true;
      $supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user || null;
      });
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
    isConfigured: computed(() => Boolean($supabase)),
    initialize,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
  };
};
