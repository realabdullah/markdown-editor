import { z } from "zod";
import type { H3Event } from "h3";
import type { ApiErrorCode } from "~/types";
import { documentIdSchema, publicationTokenSchema } from "~/shared/schemas";

export const apiError = (
  statusCode: number,
  statusMessage: string,
  code: ApiErrorCode,
  extraData: Record<string, unknown> = {},
) =>
  createError({
    statusCode,
    statusMessage,
    data: { code, ...extraData },
  });

export const parseBody = async <Schema extends z.ZodType>(
  event: H3Event,
  schema: Schema,
): Promise<z.output<Schema>> => {
  const result = schema.safeParse(await readBody(event));
  if (!result.success) {
    throw apiError(422, result.error.issues[0]?.message || "Invalid request", "VALIDATION_ERROR");
  }
  return result.data;
};

export const assertMutationOrigin = (event: H3Event) => {
  const fetchSite = getHeader(event, "sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw apiError(403, "Cross-site request rejected", "FORBIDDEN");
  }

  const origin = getHeader(event, "origin");
  if (!origin) {
    return;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw apiError(403, "Request origin is invalid", "FORBIDDEN");
  }

  if (originUrl.origin !== getRequestURL(event).origin) {
    throw apiError(403, "Request origin does not match", "FORBIDDEN");
  }
};

export const requireDocumentId = (event: H3Event) => {
  const result = documentIdSchema.safeParse(getRouterParam(event, "id"));
  if (!result.success) {
    throw apiError(404, "Document not found", "NOT_FOUND");
  }
  return result.data;
};

export const requirePublicationToken = (event: H3Event) => {
  const result = publicationTokenSchema.safeParse(getRouterParam(event, "token"));
  if (!result.success) {
    throw apiError(404, "Publication not found", "NOT_FOUND");
  }
  return result.data;
};
