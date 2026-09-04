import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { H3Event } from "h3";

const requirePublicConfig = () => {
  const config = useRuntimeConfig();
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) {
    throw apiError(503, "Cloud storage is not configured", "CONFIGURATION_ERROR");
  }
  return config;
};

export const createRequestSupabaseClient = (event: H3Event) => {
  const config = requirePublicConfig();
  return createServerClient(
    config.public.supabaseUrl,
    config.public.supabasePublishableKey,
    {
      cookies: {
        getAll: () => parseCookieHeader(getHeader(event, "cookie") || ""),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            appendResponseHeader(
              event,
              "set-cookie",
              serializeCookieHeader(name, value, options),
            );
          });
        },
      },
    },
  );
};

export const createAdminSupabaseClient = () => {
  const config = requirePublicConfig();
  if (!config.supabaseSecretKey) {
    throw apiError(503, "Server database access is not configured", "CONFIGURATION_ERROR");
  }
  return createClient(config.public.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const requireUser = async (event: H3Event) => {
  const supabase = createRequestSupabaseClient(event);
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    throw apiError(401, "Sign in is required", "AUTHENTICATION_REQUIRED");
  }
  return { supabase, userId, claims: data.claims };
};
