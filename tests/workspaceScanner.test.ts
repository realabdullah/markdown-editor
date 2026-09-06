import { describe, expect, it } from "vitest";
import {
  MAX_INDEXED_FILE_SIZE,
  buildWorkspaceTree,
  scanWorkspace,
} from "../repositories/workspaceScanner";
import {
  asDirectoryHandle,
  createMemoryDirectory,
} from "./helpers/memoryFileSystem";

const scanAll = async (files: Record<string, string>) => {
  const { root, ready } = createMemoryDirectory(files);
  await ready;
  return scanWorkspace(asDirectoryHandle(root));
};

const scan = async (files: Record<string, string>) =>
  (await scanAll(files)).files;

describe("scanWorkspace", () => {
  it("collects Markdown files recursively and ignores other file types", async () => {
    const files = await scan({
      "README.md": "# Root",
      "docs/guide.md": "# Guide",
      "docs/nested/deep.md": "# Deep",
      "docs/logo.png": "binary",
      "script.ts": "export {};",
    });

    expect(files.map((file) => file.path)).toEqual([
      "README.md",
      "docs/guide.md",
      "docs/nested/deep.md",
    ]);
    expect(files[1]).toMatchObject({ name: "guide.md", parentPath: "docs" });
  });

  it("always excludes build and tooling directories", async () => {
    const files = await scan({
      "keep.md": "keep",
      ".git/COMMIT_EDITMSG.md": "no",
      "node_modules/pkg/readme.md": "no",
      ".nuxt/doc.md": "no",
      ".output/doc.md": "no",
      "dist/doc.md": "no",
      "coverage/doc.md": "no",
    });

    expect(files.map((file) => file.path)).toEqual(["keep.md"]);
  });

  it("applies root .gitignore rules", async () => {
    const files = await scan({
      ".gitignore": "private/\nsecret.md\n",
      "public.md": "yes",
      "secret.md": "no",
      "private/notes.md": "no",
    });

    expect(files.map((file) => file.path)).toEqual(["public.md"]);
  });

  it("keeps oversized files editable but out of the content index", async () => {
    const files = await scan({
      "small.md": "small",
      "huge.md": "x".repeat(MAX_INDEXED_FILE_SIZE + 1),
    });

    expect(files.find((file) => file.path === "huge.md")?.indexStatus).toBe(
      "excluded",
    );
    expect(files.find((file) => file.path === "small.md")?.indexStatus).toBe(
      "pending",
    );
  });
});

describe("buildWorkspaceTree", () => {
  it("keeps empty directories in the tree", () => {
    const tree = buildWorkspaceTree([], ["notes", "notes/drafts"]);

    expect(tree.folders[0]?.path).toBe("notes");
    expect(tree.folders[0]?.folders[0]?.path).toBe("notes/drafts");
  });
  it("nests files under their folders", async () => {
    const tree = buildWorkspaceTree(
      await scan({
        "README.md": "root",
        "docs/guide.md": "guide",
        "docs/nested/deep.md": "deep",
      }),
    );

    const docs = tree.folders[0];

    expect(tree.files.map((file) => file.name)).toEqual(["README.md"]);
    expect(tree.folders.map((folder) => folder.path)).toEqual(["docs"]);
    expect(docs?.files.map((file) => file.name)).toEqual(["guide.md"]);
    expect(docs?.folders[0]?.path).toBe("docs/nested");
  });
});

describe("image assets", () => {
  it("collects image assets separately from Markdown files", async () => {
    const { files, assets } = await scanAll({
      "README.md": "# Root",
      "images/logo.png": "png bytes",
      "images/icon.SVG": "svg bytes",
      "docs/diagram.webp": "webp bytes",
      "docs/notes.txt": "text",
    });

    expect(files.map((file) => file.path)).toEqual(["README.md"]);
    expect(assets.map((asset) => asset.path)).toEqual([
      "docs/diagram.webp",
      "images/icon.SVG",
      "images/logo.png",
    ]);
    expect(assets[2]).toMatchObject({ name: "logo.png", parentPath: "images" });
  });

  it("applies the same exclusions to assets as to Markdown files", async () => {
    const { assets } = await scanAll({
      ".gitignore": "private/\n",
      "node_modules/pkg/logo.png": "no",
      "private/secret.png": "no",
      "keep.png": "yes",
    });

    expect(assets.map((asset) => asset.path)).toEqual(["keep.png"]);
  });
});
