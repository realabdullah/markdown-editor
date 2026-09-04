import { z } from "zod";

export const MAX_DOCUMENT_BYTES = 1024 * 1024;
export const MAX_DOCUMENTS_PER_ACCOUNT = 500;

const contentSchema = z.string().refine(
  (content) => new TextEncoder().encode(content).byteLength <= MAX_DOCUMENT_BYTES,
  "Document content must be 1 MiB or smaller",
);

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: contentSchema,
});

export const updateDocumentSchema = createDocumentSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const importDocumentSchema = createDocumentSchema.extend({
  localDocumentId: z.string().uuid(),
  createdAt: z.string().datetime().optional(),
});

export const publishDocumentSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const documentIdSchema = z.string().uuid();
export const publicationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/);
