import { createHmac } from "node:crypto";
import type { H3Event } from "h3";

type RateLimitKind = "document" | "publication" | "public-read";

const limits: Record<RateLimitKind, number> = {
  document: 60,
  publication: 10,
  "public-read": 120,
};

export const enforceRateLimit = async (
  event: H3Event,
  kind: RateLimitKind,
  identity: string,
) => {
  const config = useRuntimeConfig();
  if (!config.rateLimitPepper) {
    throw apiError(503, "Rate limiting is not configured", "CONFIGURATION_ERROR");
  }

  const key = createHmac("sha256", config.rateLimitPepper)
    .update(`${kind}:${identity}`)
    .digest("hex");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket_key: key,
    p_limit: limits[kind],
    p_window_seconds: 60,
  });

  if (error) {
    console.error("Rate limit check failed", { kind, code: error.code });
    throw apiError(503, "Rate limiting is temporarily unavailable", "CONFIGURATION_ERROR");
  }
  if (!data) {
    setResponseHeader(event, "retry-after", 60);
    throw apiError(429, "Too many requests", "RATE_LIMITED");
  }
};
