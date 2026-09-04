import { randomBytes } from "node:crypto";
import { publishDocumentSchema } from "~/shared/schemas";

export default defineEventHandler(async (event) => {
  assertMutationOrigin(event);
  const id = requireDocumentId(event);
  const { supabase, userId } = await requireUser(event);
  await enforceRateLimit(event, "publication", userId);
  const body = await parseBody(event, publishDocumentSchema);

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,title,content,version")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (documentError) {
    console.error("Publication document lookup failed", { code: documentError.code });
    throw apiError(500, "Unable to publish document", "CONFIGURATION_ERROR");
  }
  if (!document) {
    throw apiError(404, "Document not found", "NOT_FOUND");
  }
  if (document.version !== body.expectedVersion) {
    throw apiError(409, "Save the latest document version before publishing", "VERSION_CONFLICT");
  }

  const { data: current, error: currentError } = await supabase
    .from("publications")
    .select("public_token")
    .eq("document_id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (currentError) {
    console.error("Publication lookup failed", { code: currentError.code });
    throw apiError(500, "Unable to publish document", "CONFIGURATION_ERROR");
  }

  const publishedAt = new Date().toISOString();
  const query = current
    ? supabase
        .from("publications")
        .update({
          title: document.title,
          content: document.content,
          source_version: document.version,
          published_at: publishedAt,
        })
        .eq("document_id", id)
        .eq("owner_id", userId)
    : supabase.from("publications").insert({
        document_id: id,
        owner_id: userId,
        public_token: randomBytes(24).toString("base64url"),
        title: document.title,
        content: document.content,
        source_version: document.version,
        published_at: publishedAt,
      });
  const { data: publication, error } = await query
    .select("public_token,published_at,source_version")
    .single();
  if (error) {
    console.error("Publication save failed", { code: error.code });
    throw apiError(500, "Unable to publish document", "CONFIGURATION_ERROR");
  }
  return toPublicationStatus(publication, event);
});
