import { beforeEach, describe, expect, it } from "vitest";
import { BrowserWorkspaceRepository } from "../repositories/browserWorkspaceRepository";
import {
  importFolderName,
  isMigrationBannerVisible,
  migrateDocuments,
  toCollisionName,
  toImportFileName,
  type MigrationBannerState,
  type MigrationDocument,
} from "../repositories/workspaceMigration";
import type { WorkspaceSession } from "../types/workspace";
import {
  asDirectoryHandle,
  createMemoryDirectory,
  type MemoryDirectoryHandle,
} from "./helpers/memoryFileSystem";
import { createMemoryAdapter } from "./helpers/memoryWorkspaceAdapter";

const NOW = new Date(2026, 8, 5);
const FOLDER = "Markdown Editor Import 2026-09-05";

const localDocument = (
  id: string,
  title: string,
  content: string,
): MigrationDocument => ({
  source: "local",
  id,
  title,
  loadContent: async () => content,
});

describe("import folder and file naming", () => {
  it("names the folder for the day of the import", () => {
    expect(importFolderName(NOW)).toBe(FOLDER);
    expect(importFolderName(new Date(2026, 0, 9))).toBe(
      "Markdown Editor Import 2026-01-09",
    );
  });

  it("sanitizes titles into file names", () => {
    expect(toImportFileName("Release notes")).toBe("Release notes.md");
    expect(toImportFileName("docs/api: v2?")).toBe("docs api v2.md");
    expect(toImportFileName("  ..hidden.  ")).toBe("hidden.md");
    expect(toImportFileName("   ")).toBe("Untitled.md");
    expect(toImportFileName("a".repeat(200))).toBe(`${"a".repeat(80)}.md`);
  });

  it("suffixes collisions from the second file onwards", () => {
    expect(toCollisionName("Notes.md", 0)).toBe("Notes.md");
    expect(toCollisionName("Notes.md", 1)).toBe("Notes-2.md");
    expect(toCollisionName("Notes.md", 2)).toBe("Notes-3.md");
  });
});

describe("migrateDocuments", () => {
  let root: MemoryDirectoryHandle;
  let repository: BrowserWorkspaceRepository;
  let memory: ReturnType<typeof createMemoryAdapter>;
  let session: WorkspaceSession;

  beforeEach(async () => {
    const created = createMemoryDirectory({ "README.md": "# Project\n" });
    await created.ready;
    root = created.root;
    memory = createMemoryAdapter(asDirectoryHandle(root));
    repository = new BrowserWorkspaceRepository(memory.adapter);
    session = await repository.open();
  });

  const run = (documents: MigrationDocument[], now = NOW) =>
    migrateDocuments(documents, repository.migrationTarget(session), {
      workspaceId: session.id,
      now,
    });

  const readFile = async (path: string) =>
    (await repository.read(session, path)).content;

  const listFolder = async (name: string) => {
    const folder = await root.getDirectoryHandle(name);
    return [...folder.children.keys()].sort();
  };

  it("writes each document into the dated import folder", async () => {
    const result = await run([
      localDocument("1", "Release notes", "# Release notes\n"),
      localDocument("2", "Meeting: 2026/09", "notes\n"),
    ]);

    expect(result.imported).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(await listFolder(FOLDER)).toEqual([
      "Meeting 2026 09.md",
      "Release notes.md",
    ]);
    expect(await readFile(`${FOLDER}/Release notes.md`)).toBe("# Release notes\n");
  });

  it("suffixes documents that sanitize to the same file name", async () => {
    await run([
      localDocument("1", "Notes", "first\n"),
      localDocument("2", "Notes", "second\n"),
      localDocument("3", "Notes", "third\n"),
    ]);

    expect(await listFolder(FOLDER)).toEqual([
      "Notes-2.md",
      "Notes-3.md",
      "Notes.md",
    ]);
    expect(await readFile(`${FOLDER}/Notes-3.md`)).toBe("third\n");
  });

  it("records a verified marker for every imported document", async () => {
    const result = await run([localDocument("1", "Notes", "body\n")]);

    const marker = await repository.loadMigrationMarker(session.id, "local", "1");
    expect(marker).toMatchObject({
      documentId: "1",
      path: `${FOLDER}/Notes.md`,
      hash: result.imported[0]!.hash,
    });
  });

  it("skips documents that already carry a marker on a retry", async () => {
    const documents = [localDocument("1", "Notes", "body\n")];
    await run(documents);

    const retry = await run(documents);

    expect(retry.imported).toHaveLength(0);
    expect(retry.skipped).toHaveLength(1);
    expect(await listFolder(FOLDER)).toEqual(["Notes.md"]);
  });

  it("resumes an interrupted import without duplicating the file", async () => {
    // The file landed on disk but the marker was never recorded.
    await run([localDocument("1", "Notes", "body\n")]);
    memory.markers.clear();

    const retry = await run([localDocument("1", "Notes", "body\n")]);

    expect(retry.imported).toHaveLength(0);
    expect(retry.skipped).toHaveLength(1);
    expect(await listFolder(FOLDER)).toEqual(["Notes.md"]);
    expect(
      await repository.loadMigrationMarker(session.id, "local", "1"),
    ).not.toBeNull();
  });

  it("resumes an interrupted import made on an earlier day", async () => {
    await run([localDocument("1", "Notes", "body\n")], new Date(2026, 8, 1));
    memory.markers.clear();

    const retry = await run([localDocument("1", "Notes", "body\n")]);

    expect(retry.skipped[0]!.path).toBe(
      "Markdown Editor Import 2026-09-01/Notes.md",
    );
    await expect(root.getDirectoryHandle(FOLDER)).rejects.toThrow();
  });

  it("keeps a differing document of the same title as its own file", async () => {
    await run([localDocument("1", "Notes", "first\n")]);
    memory.markers.clear();

    await run([localDocument("1", "Notes", "changed\n")]);

    expect(await listFolder(FOLDER)).toEqual(["Notes-2.md", "Notes.md"]);
  });

  it("reports a failure without a marker and leaves later documents importable", async () => {
    const failing: MigrationDocument = {
      source: "account",
      id: "bad",
      title: "Broken",
      loadContent: async () => {
        throw new Error("The document could not be read.");
      },
    };

    const result = await run([failing, localDocument("2", "Good", "body\n")]);

    expect(result.failed).toEqual([
      {
        source: "account",
        id: "bad",
        title: "Broken",
        message: "The document could not be read.",
      },
    ]);
    expect(result.imported).toHaveLength(1);
    expect(
      await repository.loadMigrationMarker(session.id, "account", "bad"),
    ).toBeNull();
    expect(await listFolder(FOLDER)).toEqual(["Good.md"]);
  });

  it("never touches files that were already in the workspace", async () => {
    await run([localDocument("1", "Notes", "body\n")]);

    expect(await readFile("README.md")).toBe("# Project\n");
  });

  it("tracks the same source document separately per workspace", async () => {
    const documents = [localDocument("1", "Notes", "body\n")];
    await run(documents);

    const other = { ...session, id: "another-workspace" };
    expect(
      await repository.loadMigrationMarker(other.id, "local", "1"),
    ).toBeNull();
  });
});

describe("migration banner visibility", () => {
  const state = (overrides: Partial<MigrationBannerState> = {}): MigrationBannerState => ({
    hasWorkspace: true,
    isDismissed: false,
    localCount: 0,
    accountCount: 0,
    isAccountConfigured: true,
    isAuthReady: true,
    isSignedIn: false,
    accountLoadFailed: false,
    ...overrides,
  });

  it("offers sign-in to a signed-out user, whose account documents cannot be counted", () => {
    expect(isMigrationBannerVisible(state())).toBe(true);
  });

  it("stays hidden until auth has settled, so a signed-in user never sees the sign-in offer", () => {
    expect(isMigrationBannerVisible(state({ isAuthReady: false }))).toBe(false);
  });

  it("stays hidden when no account backend is configured and nothing is local", () => {
    expect(isMigrationBannerVisible(state({ isAccountConfigured: false }))).toBe(false);
  });

  it("shows local documents even without an account backend", () => {
    expect(
      isMigrationBannerVisible(
        state({ isAccountConfigured: false, isAuthReady: false, localCount: 2 }),
      ),
    ).toBe(true);
  });

  it("shows account documents once signed in", () => {
    expect(isMigrationBannerVisible(state({ isSignedIn: true, accountCount: 3 }))).toBe(true);
  });

  it("hides once a signed-in user has nothing left to import", () => {
    expect(isMigrationBannerVisible(state({ isSignedIn: true }))).toBe(false);
  });

  it("stays open when the account list could not be read, rather than implying none", () => {
    expect(
      isMigrationBannerVisible(state({ isSignedIn: true, accountLoadFailed: true })),
    ).toBe(true);
  });

  it("stays hidden without a workspace, and after dismissal", () => {
    expect(isMigrationBannerVisible(state({ hasWorkspace: false, localCount: 5 }))).toBe(false);
    expect(isMigrationBannerVisible(state({ isDismissed: true, localCount: 5 }))).toBe(false);
  });
});
