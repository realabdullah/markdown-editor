import { describe, expect, it } from "vitest";
import {
  fileNameOf,
  isImageAssetPath,
  parentPathOf,
  toConflictPath,
  toMarkdownPath,
  toRelativePath,
} from "../repositories/workspacePaths";

describe("workspace path helpers", () => {
  it("builds Markdown paths from typed names", () => {
    expect(toMarkdownPath("New note")).toBe("New note.md");
    expect(toMarkdownPath("guide.md", "docs")).toBe("docs/guide.md");
    expect(toMarkdownPath("a/b:c")).toBe("a-b-c.md");
  });

  it("splits paths into parent and file name", () => {
    expect(parentPathOf("docs/a/b.md")).toBe("docs/a");
    expect(parentPathOf("b.md")).toBe("");
    expect(fileNameOf("docs/a/b.md")).toBe("b.md");
  });

  it("numbers repeated conflict copies", () => {
    expect(toConflictPath("docs/api.md")).toBe("docs/api.conflict.md");
    expect(toConflictPath("docs/api.md", 1)).toBe("docs/api.conflict-2.md");
  });

  it("recognises the image types the preview can resolve", () => {
    expect(isImageAssetPath("images/logo.PNG")).toBe(true);
    expect(isImageAssetPath("a.svg")).toBe(true);
    expect(isImageAssetPath("notes.md")).toBe(false);
  });
});

describe("toRelativePath", () => {
  it("writes a reference from one file to another", () => {
    expect(toRelativePath("docs/guide.md", "images/logo.png")).toBe(
      "../images/logo.png",
    );
    expect(toRelativePath("docs/guide.md", "docs/logo.png")).toBe("logo.png");
    expect(toRelativePath("README.md", "images/logo.png")).toBe("images/logo.png");
    expect(toRelativePath("a/b/c.md", "a/x/y.png")).toBe("../x/y.png");
  });
});
