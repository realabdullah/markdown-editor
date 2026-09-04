export default defineEventHandler(async (event) => {
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,content,created_at,updated_at,version")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Document read failed", { code: error.code });
    throw apiError(500, "Unable to load document", "CONFIGURATION_ERROR");
  }
  if (!data) {
    throw apiError(404, "Document not found", "NOT_FOUND");
  }
  return toDocumentDetail(data);
});
