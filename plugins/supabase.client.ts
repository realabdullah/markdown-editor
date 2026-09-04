import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const supabase: SupabaseClient | null =
    config.public.supabaseUrl && config.public.supabasePublishableKey
      ? createBrowserClient(
          config.public.supabaseUrl,
          config.public.supabasePublishableKey,
        )
      : null;

  return {
    provide: {
      supabase,
    },
  };
});
