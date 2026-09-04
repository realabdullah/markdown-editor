export default defineEventHandler(async (event) => {
  const { supabase, userId } = await requireUser(event);
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,created_at,updated_at,version")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Document list failed", { code: error.code });
    throw apiError(500, "Unable to load documents", "CONFIGURATION_ERROR");
  }
  return (data || []).map(toDocumentSummary);
});
