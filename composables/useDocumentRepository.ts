import type {
  CreateDocumentInput,
  DocumentDetail,
  DocumentSummary,
  ImportDocumentInput,
  UpdateDocumentInput,
} from "~/types";

export interface DocumentRepository {
  list: () => Promise<DocumentSummary[]>;
  get: (id: string) => Promise<DocumentDetail>;
  create: (input: CreateDocumentInput) => Promise<DocumentDetail>;
  update: (id: string, input: UpdateDocumentInput) => Promise<DocumentDetail>;
  remove: (id: string) => Promise<void>;
}

export const useDocumentRepository = () => {
  const { user } = useAuth();
  const localDocs = useMdDocs();

  const localRepository: DocumentRepository = {
    list: async () => {
      const documents = await localDocs.getDocs();
      return documents.map(({ content: _content, ...summary }) => summary);
    },
    get: async (id) => {
      const document = (await localDocs.getDocs()).find((item) => item.id === id);
      if (!document) {
        throw new Error("Document not found");
      }
      return document;
    },
    create: async (input) => {
      const now = new Date().toISOString();
      const document: DocumentDetail = {
        id: crypto.randomUUID(),
        title: input.title,
        content: input.content,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      await localDocs.saveDoc(document);
      return document;
    },
    update: async (id, input) => {
      const current = await localRepository.get(id);
      const document: DocumentDetail = {
        ...current,
        title: input.title,
        content: input.content,
        updatedAt: new Date().toISOString(),
        version: current.version + 1,
      };
      await localDocs.saveDoc(document);
      return document;
    },
    remove: localDocs.deleteDoc,
  };

  const cloudRepository: DocumentRepository = {
    list: () => $fetch<DocumentSummary[]>("/api/documents"),
    get: (id) => $fetch<DocumentDetail>(`/api/documents/${id}`),
    create: (input) =>
      $fetch<DocumentDetail>("/api/documents", { method: "POST", body: input }),
    update: (id, input) =>
      $fetch<DocumentDetail>(`/api/documents/${id}`, {
        method: "PUT",
        body: input,
      }),
    remove: (id) => $fetch<void>(`/api/documents/${id}`, { method: "DELETE" }),
  };

  const repository = computed(() =>
    user.value ? cloudRepository : localRepository,
  );

  const importLocalDocument = (input: ImportDocumentInput) =>
    $fetch<DocumentDetail>("/api/documents/import", {
      method: "POST",
      body: input,
    });

  return { repository, localDocs, importLocalDocument };
};
