/**
 * Minimal in-memory stand-in for the File System Access API, covering the
 * surface the workspace repository uses: directory traversal, file reads,
 * writable streams, and `create` semantics.
 */

const notFound = (name: string) =>
  new DOMException(`${name} was not found.`, "NotFoundError");

export class MemoryFileHandle {
  readonly kind = "file" as const;

  constructor(
    readonly name: string,
    private readonly store: { content: string; lastModified: number },
  ) {}

  getFile = async () => {
    const { content, lastModified } = this.store;
    return {
      size: new TextEncoder().encode(content).length,
      lastModified,
      text: async () => content,
    } as unknown as File;
  };

  createWritable = async () => {
    let buffer = "";
    return {
      write: async (data: string) => {
        buffer += data;
      },
      close: async () => {
        this.store.content = buffer;
        this.store.lastModified = Date.now();
      },
    } as unknown as FileSystemWritableFileStream;
  };
}

export class MemoryDirectoryHandle {
  readonly kind = "directory" as const;
  readonly children = new Map<string, MemoryDirectoryHandle | MemoryFileHandle>();
  private isDetached = false;

  constructor(readonly name: string) {}

  /** Stands in for a folder renamed or moved out from under its handle. */
  detach = () => {
    this.isDetached = true;
  };

  async *entries(): AsyncIterableIterator<
    [string, MemoryDirectoryHandle | MemoryFileHandle]
  > {
    if (this.isDetached) throw notFound(this.name);
    for (const entry of this.children) {
      yield entry;
    }
  }

  getDirectoryHandle = async (
    name: string,
    options: { create?: boolean } = {},
  ): Promise<MemoryDirectoryHandle> => {
    if (this.isDetached) throw notFound(this.name);
    const existing = this.children.get(name);
    if (existing instanceof MemoryDirectoryHandle) return existing;
    if (existing || !options.create) throw notFound(name);

    const created = new MemoryDirectoryHandle(name);
    this.children.set(name, created);
    return created;
  };

  getFileHandle = async (
    name: string,
    options: { create?: boolean } = {},
  ): Promise<MemoryFileHandle> => {
    if (this.isDetached) throw notFound(this.name);
    const existing = this.children.get(name);
    if (existing instanceof MemoryFileHandle) return existing;
    if (existing || !options.create) throw notFound(name);

    const created = new MemoryFileHandle(name, {
      content: "",
      lastModified: Date.now(),
    });
    this.children.set(name, created);
    return created;
  };
}

/** Seeds `path` with `content`, creating intermediate directories. */
export const seedFile = async (
  root: MemoryDirectoryHandle,
  path: string,
  content: string,
) => {
  const segments = path.split("/");
  const name = segments.pop() as string;
  let directory = root;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return handle;
};

export const createMemoryDirectory = (
  files: Record<string, string> = {},
  name = "workspace",
) => {
  const root = new MemoryDirectoryHandle(name);
  const ready = Promise.all(
    Object.entries(files).map(([path, content]) => seedFile(root, path, content)),
  );
  return { root, ready };
};

export const asDirectoryHandle = (root: MemoryDirectoryHandle) =>
  root as unknown as FileSystemDirectoryHandle;
