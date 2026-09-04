export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "document", userId);
  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Document delete failed", { code: error.code });
    throw apiError(500, "Unable to delete document", "CONFIGURATION_ERROR");
  }
  if (!data) {
    throw apiError(404, "Document not found", "NOT_FOUND");
  }
  setResponseStatus(event, 204);
  return null;
});
