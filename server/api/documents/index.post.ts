import { createDocumentSchema } from "~/shared/schemas";

export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "document", userId);
  const body = await parseBody(event, createDocumentSchema);

  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (countError) {
    console.error("Document count failed", { code: countError.code });
    throw apiError(500, "Unable to create document", "CONFIGURATION_ERROR");
  }
  if ((count || 0) >= 500) {
    throw apiError(422, "Document limit reached", "DOCUMENT_LIMIT_REACHED");
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: userId, title: body.title, content: body.content })
    .select("id,title,content,created_at,updated_at,version")
    .single();
  if (error) {
    console.error("Document create failed", { code: error.code });
    const isLimitError = error.message.includes("document_limit_reached");
    throw apiError(
      isLimitError ? 422 : 500,
      isLimitError ? "Document limit reached" : "Unable to create document",
      isLimitError ? "DOCUMENT_LIMIT_REACHED" : "CONFIGURATION_ERROR",
    );
  }
  setResponseStatus(event, 201);
  return toDocumentDetail(data);
});
