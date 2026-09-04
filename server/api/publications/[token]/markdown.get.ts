const asFilename = (title: string) =>
  `${title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "document"}.md`;

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const token = requirePublicationToken(event);
  const identity = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  await enforceRateLimit(event, "public-read", identity);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("publications")
    .select("title,content")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("Public Markdown API read failed", { code: error.code });
    throw apiError(500, "Unable to download publication", "CONFIGURATION_ERROR");
  }
  if (!data) {
    setResponseStatus(event, 404, "Publication not found");
    setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
    return "Publication not found";
  }

  setResponseHeaders(event, {
    "content-type": "text/markdown; charset=utf-8",
    "content-disposition": `attachment; filename="${asFilename(data.title)}"`,
  });
  return data.content;
});
