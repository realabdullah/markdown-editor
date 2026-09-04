export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const token = requirePublicationToken(event);
  const identity = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  await enforceRateLimit(event, "public-read", identity);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("publications")
    .select("title,content,published_at")
    .eq("public_token", token)
    .maybeSingle();
  if (error) {
    console.error("Public snapshot read failed", { code: error.code });
    throw apiError(500, "Unable to load publication", "CONFIGURATION_ERROR");
  }
  if (!data) {
    setResponseStatus(event, 404, "Publication not found");
    return {
      statusCode: 404,
      statusMessage: "Publication not found",
      data: { code: "NOT_FOUND" as const },
    };
  }
  return { title: data.title, content: data.content, publishedAt: data.published_at };
});
