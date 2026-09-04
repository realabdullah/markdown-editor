export default defineEventHandler(async (event) => {
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  const { data, error } = await supabase
    .from("publications")
    .select("public_token,published_at,source_version")
    .eq("document_id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Publication status failed", { code: error.code });
    throw apiError(500, "Unable to load publication status", "CONFIGURATION_ERROR");
  }
  return toPublicationStatus(data, event);
});
