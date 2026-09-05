import { describe, expect, it } from "vitest";
import { rankQuickOpen, scoreQuickOpen } from "../utils/quickOpen";

const candidates = [
  { path: "README.md", name: "README.md" },
  { path: "docs/guide.md", name: "guide.md" },
  { path: "docs/deep/getting-started.md", name: "getting-started.md" },
  { path: "notes/2026-plan.md", name: "2026-plan.md" },
];

describe("scoreQuickOpen", () => {
  it("matches characters in order, not only as a substring", () => {
    expect(scoreQuickOpen("dgd", "docs/guide.md")).not.toBeNull();
    expect(scoreQuickOpen("zzz", "docs/guide.md")).toBeNull();
  });

  it("scores a contiguous match above a scattered one", () => {
    const contiguous = scoreQuickOpen("guide", "docs/guide.md") ?? 0;
    const scattered = scoreQuickOpen("guide", "g-u-i-d-e-x.md") ?? 0;

    expect(contiguous).toBeGreaterThan(scattered);
  });
});

describe("rankQuickOpen", () => {
  it("returns everything up to the limit for an empty query", () => {
    expect(rankQuickOpen(candidates, "", 2)).toHaveLength(2);
  });

  it("prefers a hit on the file name over one in the directory path", () => {
    const [first] = rankQuickOpen(
      [
        { path: "guide/other.md", name: "other.md" },
        { path: "docs/guide.md", name: "guide.md" },
      ],
      "guide",
    );

    expect(first?.path).toBe("docs/guide.md");
  });

  it("drops candidates that do not match at all", () => {
    expect(rankQuickOpen(candidates, "xyzq")).toEqual([]);
  });

  it("finds a nested file from initials", () => {
    expect(rankQuickOpen(candidates, "gettingst")[0]?.path).toBe(
      "docs/deep/getting-started.md",
    );
  });
});
