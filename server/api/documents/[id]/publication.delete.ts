export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "publication", userId);
  const { error } = await supabase
    .from("publications")
    .delete()
    .eq("document_id", id)
    .eq("owner_id", userId);
  if (error) {
    console.error("Publication delete failed", { code: error.code });
    throw apiError(500, "Unable to unpublish document", "CONFIGURATION_ERROR");
  }
  setResponseStatus(event, 204);
  return null;
});
