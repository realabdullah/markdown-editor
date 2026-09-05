import { beforeEach, describe, expect, it } from "vitest";
import { BrowserWorkspaceRepository } from "../repositories/browserWorkspaceRepository";
import {
  WorkspaceBaselineChangedError,
  WorkspaceFileExistsError,
  WorkspaceFileMissingError,
  WorkspaceRootMissingError,
} from "../repositories/workspaceErrors";
import { hashContent } from "../repositories/workspacePaths";
import {
  isWorkspaceConflict,
  type WorkspaceDocument,
  type WorkspaceSession,
} from "../types/workspace";
import {
  MemoryDirectoryHandle,
  asDirectoryHandle,
  createMemoryDirectory,
  seedFile,
} from "./helpers/memoryFileSystem";
import { createMemoryAdapter } from "./helpers/memoryWorkspaceAdapter";

describe("BrowserWorkspaceRepository sessions", () => {
  const build = () => {
    const { root } = createMemoryDirectory({}, "notes");
    const memory = createMemoryAdapter(asDirectoryHandle(root));
    return { memory, repository: new BrowserWorkspaceRepository(memory.adapter) };
  };

  it("persists a chosen directory", async () => {
    const { memory, repository } = build();

    const session = await repository.open();

    expect(session.directoryName).toBe("notes");
    expect(memory.getPersisted()).toMatchObject({ id: session.id });
  });

  it("restores access only after an explicit permission request", async () => {
    const { repository } = build();
    await repository.open();

    expect((await repository.restore())?.permissionState).toBe("prompt");
    expect((await repository.restore(true))?.permissionState).toBe("granted");
  });

  it("returns null when no workspace has been chosen", async () => {
    const { repository } = build();

    await expect(repository.restore()).resolves.toBeNull();
  });
});

describe("BrowserWorkspaceRepository files", () => {
  let root: MemoryDirectoryHandle;
  let repository: BrowserWorkspaceRepository;
  let session: WorkspaceSession;

  beforeEach(async () => {
    const created = createMemoryDirectory({
      "README.md": "# Project\n",
      "docs/guide.md": "# Guide\n",
    });
    await created.ready;
    root = created.root;
    repository = new BrowserWorkspaceRepository(
      createMemoryAdapter(asDirectoryHandle(root)).adapter,
    );
    session = await repository.open();
  });

  const read = async (path: string) =>
    (await (await (await root.getFileHandle(path)).getFile()).text()) as string;

  it("reads a file with a content hash baseline", async () => {
    const document = await repository.read(session, "README.md");

    expect(document.content).toBe("# Project\n");
    expect(document.baselineHash).toBe(await hashContent("# Project\n"));
    expect(document.isDirty).toBe(false);
  });

  it("creates a new file and refuses to overwrite an existing one", async () => {
    const created = await repository.create(session, "notes.md", "hello");

    expect(created.path).toBe("notes.md");
    expect(await read("notes.md")).toBe("hello");
    await expect(repository.create(session, "notes.md", "again")).rejects.toBeInstanceOf(
      WorkspaceFileExistsError,
    );
  });

  it("writes and verifies content by rereading and rehashing it", async () => {
    const document = await repository.read(session, "README.md");

    const saved = await repository.write(session, {
      ...document,
      content: "# Project\n\nEdited.\n",
      isDirty: true,
    });

    expect(await read("README.md")).toBe("# Project\n\nEdited.\n");
    expect(saved.isDirty).toBe(false);
    expect(saved.baselineHash).toBe(await hashContent("# Project\n\nEdited.\n"));
  });

  it("refuses to write over a file that changed since it was opened", async () => {
    const document = await repository.read(session, "README.md");
    await seedFile(root, "README.md", "# Changed elsewhere\n");

    await expect(
      repository.write(session, { ...document, content: "mine", isDirty: true }),
    ).rejects.toBeInstanceOf(WorkspaceBaselineChangedError);
    expect(await read("README.md")).toBe("# Changed elsewhere\n");
  });

  it("reloads a clean file that changed externally", async () => {
    const document = await repository.read(session, "docs/guide.md");
    await seedFile(root, "docs/guide.md", "# Guide v2\n");

    const result = await repository.refresh(session, document);

    expect(isWorkspaceConflict(result)).toBe(false);
    expect((result as WorkspaceDocument).content).toBe("# Guide v2\n");
  });

  it("reports a conflict when a dirty file changed externally", async () => {
    const document = await repository.read(session, "docs/guide.md");
    await seedFile(root, "docs/guide.md", "# Guide v2\n");

    const result = await repository.refresh(session, {
      ...document,
      content: "# My edit\n",
      isDirty: true,
    });

    expect(isWorkspaceConflict(result)).toBe(true);
    if (!isWorkspaceConflict(result)) return;
    expect(result.localContent).toBe("# My edit\n");
    expect(result.externalContent).toBe("# Guide v2\n");
  });

  it("leaves an unchanged file untouched on refresh", async () => {
    const document = await repository.read(session, "README.md");

    const result = await repository.refresh(session, {
      ...document,
      content: "# My edit\n",
      isDirty: true,
    });

    expect(isWorkspaceConflict(result)).toBe(false);
    expect((result as WorkspaceDocument).content).toBe("# My edit\n");
  });

  it("writes local content to a numbered conflict copy", async () => {
    const document = await repository.read(session, "docs/guide.md");
    await seedFile(root, "docs/guide.md", "# Guide v2\n");
    const conflict = await repository.refresh(session, {
      ...document,
      content: "# My edit\n",
      isDirty: true,
    });
    if (!isWorkspaceConflict(conflict)) throw new Error("expected a conflict");

    const first = await repository.createConflictCopy(session, conflict);
    const second = await repository.createConflictCopy(session, conflict);

    expect(first.path).toBe("docs/guide.conflict.md");
    expect(second.path).toBe("docs/guide.conflict-2.md");
    expect(first.content).toBe("# My edit\n");
  });

  it("surfaces a permission failure instead of losing the document", async () => {
    const document = await repository.read(session, "README.md");
    root.getFileHandle = async () => {
      throw new DOMException("denied", "NotAllowedError");
    };

    await expect(
      repository.write(session, { ...document, content: "mine", isDirty: true }),
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("stores and clears recovery drafts and the last opened file", async () => {
    await repository.saveDraft({
      workspaceId: session.id,
      path: "README.md",
      content: "draft text",
      baselineHash: "abc",
      updatedAt: 1,
    });
    await repository.saveLastOpened(session.id, "README.md");

    expect((await repository.loadDraft(session.id, "README.md"))?.content).toBe(
      "draft text",
    );
    expect(await repository.loadLastOpened(session.id)).toBe("README.md");

    await repository.clearDraft(session.id, "README.md");
    expect(await repository.loadDraft(session.id, "README.md")).toBeNull();
  });

  it("scans the opened session", async () => {
    const { files } = await repository.scan(session);

    expect(files.map((file) => file.path)).toEqual([
      "README.md",
      "docs/guide.md",
    ]);
  });
});

describe("BrowserWorkspaceRepository folders that move on disk", () => {
  const build = async () => {
    const created = createMemoryDirectory({ "new-note.md": "# Note\n" }, "notes");
    await created.ready;
    const memory = createMemoryAdapter(asDirectoryHandle(created.root));
    const repository = new BrowserWorkspaceRepository(memory.adapter);
    const session = await repository.open();
    return { root: created.root, memory, repository, session };
  };

  it("reports a renamed workspace folder rather than a failed file read", async () => {
    const { root, repository, session } = await build();
    root.detach();

    await expect(repository.read(session, "new-note.md")).rejects.toBeInstanceOf(
      WorkspaceRootMissingError,
    );
    await expect(repository.scan(session)).rejects.toBeInstanceOf(
      WorkspaceRootMissingError,
    );
  });

  it("reports a missing file when the folder itself is intact", async () => {
    const { root, repository, session } = await build();
    root.children.delete("new-note.md");

    await expect(repository.read(session, "new-note.md")).rejects.toBeInstanceOf(
      WorkspaceFileMissingError,
    );
  });

  it("keeps the workspace id when reconnecting, so drafts survive", async () => {
    const { root, memory, repository, session } = await build();
    await repository.saveDraft({
      workspaceId: session.id,
      path: "new-note.md",
      content: "unsaved text",
      baselineHash: await hashContent("# Note\n"),
      updatedAt: Date.now(),
    });
    root.detach();

    const renamed = createMemoryDirectory({ "new-note.md": "# Note\n" }, "notes-2025");
    await renamed.ready;
    memory.setPickable(asDirectoryHandle(renamed.root));
    const reconnected = await repository.reconnect();

    expect(reconnected.id).toBe(session.id);
    expect(reconnected.directoryName).toBe("notes-2025");
    expect(
      (await repository.loadDraft(reconnected.id, "new-note.md"))?.content,
    ).toBe("unsaved text");
    expect((await repository.read(reconnected, "new-note.md")).content).toBe("# Note\n");
  });
});
