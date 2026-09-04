import type { SupabaseClient } from "@supabase/supabase-js";

declare module "#app" {
  interface NuxtApp {
    $supabase: SupabaseClient | null;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $supabase: SupabaseClient | null;
  }
}

export {};
