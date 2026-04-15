import { openDB } from "idb";
import type { MarkdownDoc } from "../types";

const DB_NAME = "markdown_editor_docs";
const STORE_NAME = "documents";
const LEGACY_DB_NAME = "mdDocs";
const LEGACY_STORE_NAME = "mdDocs";

interface LegacyMarkdownDoc {
  id: string;
  title: string;
  content: string;
  created?: string;
}

const toMarkdownDoc = (
  doc: Partial<MarkdownDoc> & LegacyMarkdownDoc,
): MarkdownDoc => {
  const createdAt = doc.createdAt || doc.created || new Date().toISOString();
  const updatedAt = doc.updatedAt || createdAt;
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt,
    updatedAt,
  };
};

export const useMdDocs = () => {
  const getDb = async () => {
    if (!import.meta.client) {
      return null;
    }
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  };

  const migrateLegacyDocs = async (db: Awaited<ReturnType<typeof getDb>>) => {
    if (!db || !import.meta.client) {
      return;
    }

    const existing = (await db.getAll(STORE_NAME)) as MarkdownDoc[];
    if (existing.length > 0) {
      return;
    }

    let legacyDb: Awaited<ReturnType<typeof openDB>> | null = null;
    try {
      legacyDb = await openDB(LEGACY_DB_NAME, 1);
      if (!legacyDb.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        return;
      }

      const legacyDocs = (await legacyDb.getAll(
        LEGACY_STORE_NAME,
      )) as LegacyMarkdownDoc[];
      if (!legacyDocs.length) {
        return;
      }

      await Promise.all(
        legacyDocs
          .filter((doc) => doc.id && doc.title && typeof doc.content === "string")
          .map((doc) => db.put(STORE_NAME, toMarkdownDoc(doc))),
      );
    } catch {
      // If legacy DB doesn't exist or is inaccessible, continue safely.
    } finally {
      legacyDb?.close();
    }
  };

  const getDocs = async (): Promise<MarkdownDoc[]> => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    await migrateLegacyDocs(db);
    const docs = ((await db.getAll(STORE_NAME)) as Array<
      MarkdownDoc | LegacyMarkdownDoc
    >).map((doc) => toMarkdownDoc(doc as Partial<MarkdownDoc> & LegacyMarkdownDoc));
    return docs.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

  const saveDoc = async (doc: MarkdownDoc) => {
    const db = await getDb();
    if (!db) {
      return;
    }
    await db.put(STORE_NAME, doc);
  };

  const deleteDoc = async (id: string) => {
    const db = await getDb();
    if (!db) {
      return;
    }
    await db.delete(STORE_NAME, id);
  };

  return { getDocs, saveDoc, deleteDoc };
};
