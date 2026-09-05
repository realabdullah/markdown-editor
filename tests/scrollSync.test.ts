import { describe, expect, it } from "vitest";
import {
  buildScrollAnchors,
  createEchoGuard,
  lineForOffset,
  offsetForLine,
} from "../utils/scrollSync";

const anchors = buildScrollAnchors([
  { line: 1, top: 0 },
  { line: 5, top: 100 },
  { line: 9, top: 300 },
  { line: 21, top: 600 },
]);

describe("buildScrollAnchors", () => {
  it("drops repeated lines from nested blocks", () => {
    expect(
      buildScrollAnchors([
        { line: 7, top: 100 },
        { line: 7, top: 100 },
        { line: 8, top: 130 },
      ]),
    ).toEqual([
      { line: 7, top: 100 },
      { line: 8, top: 130 },
    ]);
  });

  it("drops entries that do not advance the offset", () => {
    expect(
      buildScrollAnchors([
        { line: 1, top: 0 },
        { line: 2, top: 0 },
        { line: 3, top: 40 },
      ]).map((a) => a.line),
    ).toEqual([1, 3]);
  });

  it("ignores unmeasurable entries", () => {
    expect(
      buildScrollAnchors([
        { line: Number.NaN, top: 0 },
        { line: 2, top: 20 },
      ]),
    ).toEqual([{ line: 2, top: 20 }]);
  });
});

describe("offsetForLine", () => {
  it("interpolates between blocks instead of snapping to one", () => {
    expect(offsetForLine(anchors, 5)).toBe(100);
    expect(offsetForLine(anchors, 7)).toBe(200);
    expect(offsetForLine(anchors, 6)).toBe(150);
  });

  it("follows a fractional line smoothly", () => {
    expect(offsetForLine(anchors, 5.5)).toBe(125);
    expect(offsetForLine(anchors, 5.25)).toBe(112.5);
  });

  it("never moves backwards as the line advances", () => {
    let previous = -1;
    for (let line = 1; line <= 25; line += 0.25) {
      const offset = offsetForLine(anchors, line);
      expect(offset).toBeGreaterThanOrEqual(previous);
      previous = offset;
    }
  });

  it("clamps outside the measured range", () => {
    expect(offsetForLine(anchors, 0)).toBe(0);
    expect(offsetForLine(anchors, 999)).toBe(600);
    expect(offsetForLine([], 4)).toBe(0);
  });
});

describe("lineForOffset", () => {
  it("inverts offsetForLine", () => {
    for (const line of [1, 3.5, 5, 7.25, 9, 15, 21]) {
      expect(lineForOffset(anchors, offsetForLine(anchors, line))).toBeCloseTo(
        line,
        6,
      );
    }
  });

  it("clamps outside the measured range", () => {
    expect(lineForOffset(anchors, -50)).toBe(1);
    expect(lineForOffset(anchors, 5000)).toBe(21);
    expect(lineForOffset([], 100)).toBe(1);
  });
});

describe("createEchoGuard", () => {
  it("swallows exactly the scroll its own write provoked", () => {
    const guard = createEchoGuard();

    guard.record(400);
    expect(guard.isEcho(400)).toBe(true);
    // A second event is the reader scrolling, not the echo.
    expect(guard.isEcho(400)).toBe(false);
  });

  it("treats a clamped landing as an echo", () => {
    const guard = createEchoGuard();

    // The browser clamped the write; `record` stores what it actually landed on.
    guard.record(880);
    expect(guard.isEcho(880.4)).toBe(true);
  });

  it("does not swallow a scroll away from the written offset", () => {
    const guard = createEchoGuard();

    guard.record(400);
    expect(guard.isEcho(560)).toBe(false);
  });

  it("reports no echo before anything was written", () => {
    expect(createEchoGuard().isEcho(120)).toBe(false);
  });
});
