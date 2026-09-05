import { describe, expect, it } from "vitest";
import { WorkspaceSearchIndex } from "../repositories/workspaceIndex";
import {
  fileNameOf,
  hashContent,
  parentPathOf,
  toConflictPath,
  toMarkdownPath,
} from "../repositories/workspacePaths";

describe("WorkspaceSearchIndex", () => {
  it("finds the first matching line per file", () => {
    const index = new WorkspaceSearchIndex();
    index.set("a.md", "# Title\nDeploy notes here\nDeploy again");
    index.set("b.md", "unrelated");

    expect(index.search("deploy")).toEqual([
      { path: "a.md", line: 2, excerpt: "Deploy notes here" },
    ]);
  });

  it("returns nothing for an empty query and drops removed files", () => {
    const index = new WorkspaceSearchIndex();
    index.set("a.md", "content");

    expect(index.search("   ")).toEqual([]);
    index.delete("a.md");
    expect(index.search("content")).toEqual([]);
    expect(index.size).toBe(0);
  });
});

describe("workspace paths", () => {
  it("normalises typed names into workspace-relative .md paths", () => {
    expect(toMarkdownPath("Release notes")).toBe("Release notes.md");
    expect(toMarkdownPath("notes.md", "docs")).toBe("docs/notes.md");
    expect(toMarkdownPath("a/b:c")).toBe("a-b-c.md");
  });

  it("splits paths into parent and name", () => {
    expect(parentPathOf("docs/api/index.md")).toBe("docs/api");
    expect(parentPathOf("index.md")).toBe("");
    expect(fileNameOf("docs/api/index.md")).toBe("index.md");
  });

  it("suffixes conflict copies", () => {
    expect(toConflictPath("docs/guide.md")).toBe("docs/guide.conflict.md");
    expect(toConflictPath("docs/guide.md", 1)).toBe("docs/guide.conflict-2.md");
  });

  it("hashes content with SHA-256", async () => {
    await expect(hashContent("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
