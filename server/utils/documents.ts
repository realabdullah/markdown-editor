import type { DocumentDetail, DocumentSummary, PublicationStatus } from "~/types";

interface DocumentRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface PublicationRow {
  public_token: string;
  published_at: string;
  source_version: number;
}

export const toDocumentSummary = (row: Omit<DocumentRow, "content">): DocumentSummary => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  version: row.version,
});

export const toDocumentDetail = (row: DocumentRow): DocumentDetail => ({
  ...toDocumentSummary(row),
  content: row.content,
});

export const toPublicationStatus = (
  row: PublicationRow | null,
  event: Parameters<typeof getRequestURL>[0],
): PublicationStatus => ({
  isPublished: Boolean(row),
  publicToken: row?.public_token || null,
  publicUrl: row
    ? new URL(`/p/${row.public_token}`, getRequestURL(event).origin).toString()
    : null,
  publishedAt: row?.published_at || null,
  sourceVersion: row?.source_version || null,
});
