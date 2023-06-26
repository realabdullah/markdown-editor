import { openDB } from "idb";

export const useMdDocs = () => {
  const dbPromise = openDB("mdDocs", 1, {
    upgrade(db) {
      db.createObjectStore("mdDocs", { keyPath: "id" });
    },
  });

  // get all docs
  const getDocs = async () => {
    const db = await dbPromise;
    const tx = db.transaction("mdDocs", "readonly");
    const store = tx.objectStore("mdDocs");
    return await store.getAll();
  };

  // get doc by id
  const getDoc = async (id: string) => {
    const db = await dbPromise;
    const tx = db.transaction("mdDocs", "readonly");
    const store = tx.objectStore("mdDocs");
    return await store.get(id);
  };

  // save doc
  const saveDoc = async (doc: Doc) => {
    const db = await dbPromise;
    const tx = db.transaction("mdDocs", "readwrite");
    const store = tx.objectStore("mdDocs");
    await store.put(doc);
  };

  // add doc
  const addDoc = async (doc: Doc) => {
    const db = await dbPromise;
    const tx = db.transaction("mdDocs", "readwrite");
    const store = tx.objectStore("mdDocs");
    await store.add(doc);
  };

  // delete doc
  const deleteDoc = async (id: string) => {
    const db = await dbPromise;
    const tx = db.transaction("mdDocs", "readwrite");
    const store = tx.objectStore("mdDocs");
    await store.delete(id);
  };

  return { getDocs, getDoc, saveDoc, addDoc, deleteDoc };
};
