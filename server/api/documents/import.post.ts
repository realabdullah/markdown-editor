import { importDocumentSchema } from "~/shared/schemas";

export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "document", userId);
  const body = await parseBody(event, importDocumentSchema);

  const { data: existingImport, error: lookupError } = await supabase
    .from("document_imports")
    .select("document_id")
    .eq("owner_id", userId)
    .eq("local_document_id", body.localDocumentId)
    .maybeSingle();
  if (lookupError) {
    console.error("Import lookup failed", { code: lookupError.code });
    throw apiError(500, "Unable to import document", "CONFIGURATION_ERROR");
  }
  if (existingImport) {
    const { data: existingDocument } = await supabase
      .from("documents")
      .select("id,title,content,created_at,updated_at,version")
      .eq("id", existingImport.document_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (existingDocument) {
      return toDocumentDetail(existingDocument);
    }
  }

  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (countError) {
    console.error("Import count failed", { code: countError.code });
    throw apiError(500, "Unable to import document", "CONFIGURATION_ERROR");
  }
  if ((count || 0) >= 500) {
    throw apiError(422, "Document limit reached", "DOCUMENT_LIMIT_REACHED");
  }

  const { data: document, error: createError } = await supabase
    .from("documents")
    .insert({
      owner_id: userId,
      title: body.title,
      content: body.content,
      ...(body.createdAt ? { created_at: body.createdAt } : {}),
    })
    .select("id,title,content,created_at,updated_at,version")
    .single();
  if (createError) {
    console.error("Imported document create failed", { code: createError.code });
    const isLimitError = createError.message.includes("document_limit_reached");
    throw apiError(
      isLimitError ? 422 : 500,
      isLimitError ? "Document limit reached" : "Unable to import document",
      isLimitError ? "DOCUMENT_LIMIT_REACHED" : "CONFIGURATION_ERROR",
    );
  }

  const { error: mappingError } = await supabase.from("document_imports").insert({
    owner_id: userId,
    local_document_id: body.localDocumentId,
    document_id: document.id,
  });
  if (mappingError) {
    await supabase
      .from("documents")
      .delete()
      .eq("id", document.id)
      .eq("owner_id", userId);
    if (mappingError.code === "23505") {
      throw apiError(409, "This local document was imported concurrently", "VERSION_CONFLICT");
    }
    console.error("Import mapping failed", { code: mappingError.code });
    throw apiError(500, "Unable to finish document import", "CONFIGURATION_ERROR");
  }

  setResponseStatus(event, 201);
  return toDocumentDetail(document);
});
