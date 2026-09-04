import { updateDocumentSchema } from "~/shared/schemas";

export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "document", userId);
  const body = await parseBody(event, updateDocumentSchema);

  const { data, error } = await supabase
    .from("documents")
    .update({ title: body.title, content: body.content })
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("version", body.expectedVersion)
    .select("id,title,content,created_at,updated_at,version")
    .maybeSingle();
  if (error) {
    console.error("Document update failed", { code: error.code });
    throw apiError(500, "Unable to save document", "CONFIGURATION_ERROR");
  }
  if (data) {
    return toDocumentDetail(data);
  }

  const { data: current, error: currentError } = await supabase
    .from("documents")
    .select("id,title,content,created_at,updated_at,version")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (currentError) {
    console.error("Conflict lookup failed", { code: currentError.code });
    throw apiError(500, "Unable to save document", "CONFIGURATION_ERROR");
  }
  if (!current) {
    throw apiError(404, "Document not found", "NOT_FOUND");
  }
  throw apiError(409, "A newer version was saved elsewhere", "VERSION_CONFLICT", {
    currentDocument: toDocumentDetail(current),
  });
});
