import { describe, expect, it } from "vitest";
import {
  insertCodeBlock,
  insertLink,
  insertTable,
  toggleBlockquote,
  toggleBulletList,
  toggleHeading,
  toggleInlineMarker,
  toggleOrderedList,
  toggleTaskItem,
} from "../utils/markdownFormatting";

describe("inline markers", () => {
  it("wraps the selection and keeps it selected", () => {
    const result = toggleInlineMarker("make bold now", 5, 9, "**");

    expect(result.text).toBe("make **bold** now");
    expect(result.text.slice(result.from, result.to)).toBe("bold");
  });

  it("unwraps a selection that already includes the markers", () => {
    const result = toggleInlineMarker("make **bold** now", 5, 13, "**");

    expect(result.text).toBe("make bold now");
    expect(result.text.slice(result.from, result.to)).toBe("bold");
  });

  it("unwraps when the markers sit just outside the selection", () => {
    const result = toggleInlineMarker("make **bold** now", 7, 11, "**");

    expect(result.text).toBe("make bold now");
    expect(result.text.slice(result.from, result.to)).toBe("bold");
  });
});

describe("line prefixes", () => {
  it("applies and removes a heading level across the selection", () => {
    const applied = toggleHeading("one\ntwo", 0, 7, 2);
    expect(applied.text).toBe("## one\n## two");

    const removed = toggleHeading(applied.text, 0, applied.text.length, 2);
    expect(removed.text).toBe("one\ntwo");
  });

  it("replaces an existing heading level rather than stacking hashes", () => {
    expect(toggleHeading("### deep", 0, 0, 1).text).toBe("# deep");
  });

  it("toggles bullet and numbered lists", () => {
    const bullets = toggleBulletList("a\nb", 0, 3);
    expect(bullets.text).toBe("- a\n- b");
    expect(toggleBulletList(bullets.text, 0, bullets.text.length).text).toBe("a\nb");

    const ordered = toggleOrderedList("a\nb", 0, 3);
    expect(ordered.text).toBe("1. a\n2. b");
  });

  it("converts a bullet list to a numbered list in one step", () => {
    expect(toggleOrderedList("- a\n- b", 0, 7).text).toBe("1. a\n2. b");
  });

  it("adds, ticks, and unticks task items", () => {
    const added = toggleTaskItem("write tests", 0, 0);
    expect(added.text).toBe("- [ ] write tests");

    const ticked = toggleTaskItem(added.text, 0, 0);
    expect(ticked.text).toBe("- [x] write tests");

    expect(toggleTaskItem(ticked.text, 0, 0).text).toBe("- [ ] write tests");
  });

  it("toggles blockquotes", () => {
    const quoted = toggleBlockquote("note", 0, 4);
    expect(quoted.text).toBe("> note");
    expect(toggleBlockquote(quoted.text, 0, 6).text).toBe("note");
  });

  it("only edits the lines the selection touches", () => {
    expect(toggleBulletList("first\nsecond\nthird", 6, 12).text).toBe(
      "first\n- second\nthird",
    );
  });
});

describe("block insertions", () => {
  it("uses the selection as the link text and selects the empty target", () => {
    const result = insertLink("see docs here", 4, 8);

    expect(result.text).toBe("see [docs]() here");
    expect(result.from).toBe(result.to);
    expect(result.text.slice(0, result.from)).toBe("see [docs](");
  });

  it("fences the selected lines and reselects their content", () => {
    const result = insertCodeBlock("const x = 1;", 0, 12, "ts");

    expect(result.text).toBe("```ts\nconst x = 1;\n```");
    expect(result.text.slice(result.from, result.to)).toBe("const x = 1;");
  });

  it("inserts a starter table above the current line", () => {
    const result = insertTable("after", 0);

    expect(result.text).toBe(
      "| Column | Column |\n| --- | --- |\n| Cell | Cell |\nafter",
    );
    expect(result.text.slice(result.from, result.to)).toBe("Column");
  });
});
