export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  let configuredSupabaseOrigin = "";
  try {
    if (config.public.supabaseUrl) {
      configuredSupabaseOrigin = new URL(config.public.supabaseUrl).origin;
    }
  } catch {
    // Environment validation in the Supabase client reports the invalid value.
  }
  const connectSources = [
    "'self'",
    configuredSupabaseOrigin,
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ].filter(Boolean).join(" ");

  setResponseHeaders(event, {
    "content-security-policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // blob: carries workspace images the preview resolves from local files.
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSources}`,
    ].join("; "),
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  });

  if (event.path.startsWith("/p/")) {
    setResponseHeader(event, "cache-control", "no-store");
  }
});
