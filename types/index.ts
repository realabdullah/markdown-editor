export interface DocumentSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
}

export type MarkdownDoc = DocumentDetail;

export interface CreateDocumentInput {
  title: string;
  content: string;
}

export interface UpdateDocumentInput extends CreateDocumentInput {
  expectedVersion: number;
}

export interface ImportDocumentInput extends CreateDocumentInput {
  localDocumentId: string;
  createdAt?: string;
}

export interface PublicationStatus {
  isPublished: boolean;
  publicToken: string | null;
  publicUrl: string | null;
  publishedAt: string | null;
  sourceVersion: number | null;
}

export interface PublicSnapshot {
  title: string;
  content: string;
  publishedAt: string;
}

export type ApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "REAUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DOCUMENT_LIMIT_REACHED"
  | "VERSION_CONFLICT"
  | "RATE_LIMITED"
  | "CONFIGURATION_ERROR";

export interface ApiErrorBody {
  statusCode: number;
  statusMessage: string;
  data?: {
    code: ApiErrorCode;
    currentDocument?: DocumentDetail;
  };
}
