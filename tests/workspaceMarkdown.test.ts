import { describe, expect, it } from "vitest";
import {
  collectImageReferences,
  countDocumentStats,
  extractOutline,
  outlineIdAtLine,
  renderWorkspaceMarkdown,
  resolveWorkspacePath,
  slugifyHeading,
} from "../utils/workspaceMarkdown";

describe("renderWorkspaceMarkdown GitHub-flavoured features", () => {
  it("renders tables, strikethrough, autolinks, and fenced code", () => {
    const html = renderWorkspaceMarkdown(
      [
        "| A | B |",
        "| --- | --- |",
        "| 1 | 2 |",
        "",
        "~~gone~~ and https://example.com",
        "",
        "```ts",
        "const x = 1;",
        "```",
      ].join("\n"),
    );

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<s>gone</s>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('class="language-ts"');
    expect(html).toContain("const x = 1;");
  });

  it("renders task lists as disabled checkboxes", () => {
    const html = renderWorkspaceMarkdown("- [ ] todo\n- [x] done\n");

    expect(html).toContain('class="task-list-item"');
    expect(html.match(/<input/g)).toHaveLength(2);
    expect(html).toContain("checked");
    expect(html).toContain("todo");
    expect(html).toContain("done");
  });

  it("gives headings stable anchors and suffixes repeats", () => {
    const html = renderWorkspaceMarkdown("# API Reference\n\n## Notes\n\n## Notes\n");

    expect(html).toContain('id="api-reference"');
    expect(html).toContain('id="notes"');
    expect(html).toContain('id="notes-1"');
  });

  it("leaves typographic characters exactly as they were typed", () => {
    const html = renderWorkspaceMarkdown('"quoted" -- dash ...\n');

    expect(html).toContain('"quoted" -- dash ...');
    expect(html).not.toContain("…");
    expect(html).not.toContain("–");
  });

  it("stamps block elements with their source line", () => {
    const html = renderWorkspaceMarkdown("# Title\n\nBody text\n");

    expect(html).toContain('data-source-line="1"');
    expect(html).toContain('data-source-line="3"');
  });

  it("strips scripts and event handlers from the rendered output", () => {
    const html = renderWorkspaceMarkdown(
      "[click](javascript:alert(1))\n\n<script>alert(1)</script>\n",
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="javascript');
  });
});

describe("preview image handling", () => {
  it("keeps remote https images and defers relative ones to the preview", () => {
    const html = renderWorkspaceMarkdown(
      "![remote](https://example.com/a.png)\n\n![local](../images/logo.png)\n",
      "docs/guide.md",
    );

    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('data-relative-src="images/logo.png"');
    expect(html).not.toContain('src="../images/logo.png"');
  });

  it("drops images that are neither local nor https", () => {
    const html = renderWorkspaceMarkdown("![bad](http://example.com/a.png)\n");

    expect(html).not.toContain("<img");
    expect(html).toContain("bad");
  });

  it("collects the relative image references a document makes", () => {
    expect(
      collectImageReferences(
        "![a](./logo.png) ![b](../shared/icon.svg) ![c](https://example.com/x.png)",
        "docs/guide.md",
      ),
    ).toEqual(["docs/logo.png", "shared/icon.svg"]);
  });
});

describe("resolveWorkspacePath", () => {
  it("resolves references against the containing document", () => {
    expect(resolveWorkspacePath("docs/guide.md", "images/logo.png")).toBe(
      "docs/images/logo.png",
    );
    expect(resolveWorkspacePath("docs/a/b.md", "../logo.png")).toBe("docs/logo.png");
    expect(resolveWorkspacePath("docs/guide.md", "/root.png")).toBe("root.png");
    expect(resolveWorkspacePath("docs/guide.md", "logo.png?v=2")).toBe(
      "docs/logo.png",
    );
  });

  it("refuses references that escape the workspace root", () => {
    expect(resolveWorkspacePath("guide.md", "../outside.png")).toBe("");
  });
});

describe("outline and counts", () => {
  it("extracts headings with levels, anchors, and source lines", () => {
    expect(extractOutline("# One\n\ntext\n\n## Two\n\n### Three\n")).toEqual([
      { id: "one", level: 1, text: "One", line: 1 },
      { id: "two", level: 2, text: "Two", line: 5 },
      { id: "three", level: 3, text: "Three", line: 7 },
    ]);
  });

  it("matches the anchors the renderer produces for repeated headings", () => {
    expect(extractOutline("## Notes\n\n## Notes\n").map((item) => item.id)).toEqual([
      "notes",
      "notes-1",
    ]);
  });

  it("slugifies punctuation the way heading anchors do", () => {
    expect(slugifyHeading("Getting Started: Step 1!")).toBe("getting-started-step-1");
  });

  it("counts words and characters", () => {
    expect(countDocumentStats("one two  three\nfour\n")).toEqual({
      words: 4,
      characters: 20,
    });
    expect(countDocumentStats("   ")).toEqual({ words: 0, characters: 3 });
  });
});

describe("outlineIdAtLine", () => {
  const outline = extractOutline("# One\n\ntext\n\n## Two\n\ntext\n\n### Three\n");

  it("marks the heading the line belongs to", () => {
    expect(outlineIdAtLine(outline, 1)).toBe("one");
    expect(outlineIdAtLine(outline, 3)).toBe("one");
    expect(outlineIdAtLine(outline, 5)).toBe("two");
    expect(outlineIdAtLine(outline, 9)).toBe("three");
    expect(outlineIdAtLine(outline, 400)).toBe("three");
  });

  it("accepts the fractional lines the scroll sync reports", () => {
    expect(outlineIdAtLine(outline, 4.9)).toBe("one");
    expect(outlineIdAtLine(outline, 5.0)).toBe("two");
    expect(outlineIdAtLine(outline, 5.4)).toBe("two");
  });

  it("marks nothing above the first heading", () => {
    expect(outlineIdAtLine(extractOutline("intro\n\n## Later\n"), 1)).toBe("");
    expect(outlineIdAtLine([], 12)).toBe("");
  });
});
