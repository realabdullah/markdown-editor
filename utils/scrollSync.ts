/**
 * The mapping between source lines and pixel offsets that keeps the editor and
 * the preview aligned while either one is scrolled.
 *
 * Anchors are sparse — one per rendered block — so a line that falls between two
 * of them is interpolated rather than snapped to the nearest block. Snapping is
 * what makes a synced preview lurch from heading to heading instead of tracking
 * the text, so both directions work in fractional lines.
 */
export interface ScrollAnchor {
  /** 1-based source line. May be fractional when interpolated. */
  line: number;
  /** The scroll offset that puts this line at the top of its viewport. */
  top: number;
}

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

/**
 * Normalises raw block positions into a table that is strictly increasing in
 * both line and offset. Nested blocks repeat a line (a list and its first item
 * share one) and empty blocks repeat an offset; either would divide by zero
 * during interpolation, so only the first entry of each run is kept.
 */
export const buildScrollAnchors = (raw: ScrollAnchor[]): ScrollAnchor[] => {
  const anchors: ScrollAnchor[] = [];
  for (const anchor of raw) {
    if (!Number.isFinite(anchor.line) || !Number.isFinite(anchor.top)) continue;
    const previous = anchors[anchors.length - 1];
    if (previous && (anchor.line <= previous.line || anchor.top <= previous.top)) {
      continue;
    }
    anchors.push(anchor);
  }
  return anchors;
};

/** Index of the last anchor at or before `value`, by the chosen field. */
const indexBefore = (
  anchors: ScrollAnchor[],
  value: number,
  field: "line" | "top",
): number => {
  let low = 0;
  let high = anchors.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((anchors[middle] as ScrollAnchor)[field] <= value) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
};

/** The scroll offset that shows `line` at the top, interpolated between blocks. */
export const offsetForLine = (anchors: ScrollAnchor[], line: number): number => {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 0;
  if (line <= first.line) return first.top;
  if (line >= last.line) return last.top;

  const index = indexBefore(anchors, line, "line");
  const before = anchors[index] as ScrollAnchor;
  const after = anchors[index + 1];
  if (!after) return before.top;

  const progress = (line - before.line) / (after.line - before.line);
  return before.top + progress * (after.top - before.top);
};

/** The inverse: the fractional source line shown at `offset`. */
export const lineForOffset = (anchors: ScrollAnchor[], offset: number): number => {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 1;
  if (offset <= first.top) return first.line;
  if (offset >= last.top) return last.line;

  const index = indexBefore(anchors, offset, "top");
  const before = anchors[index] as ScrollAnchor;
  const after = anchors[index + 1];
  if (!after) return before.line;

  const progress = (offset - before.top) / (after.top - before.top);
  return before.line + progress * (after.line - before.line);
};

/**
 * Tracks the offset a pane was last scrolled to programmatically, so the scroll
 * event that assignment provokes is not mistaken for the reader scrolling and
 * echoed back at the pane that drove it. The value is read back after writing
 * because the browser clamps it at the ends of the document.
 */
export const createEchoGuard = () => {
  let expected: number | null = null;

  return {
    /** Records what a programmatic scroll actually landed on. */
    record: (actual: number) => {
      expected = actual;
    },
    /** True when this scroll event is the echo of our own last write. */
    isEcho: (actual: number) => {
      if (expected === null) return false;
      const echo = Math.abs(actual - expected) < 1;
      expected = null;
      return echo;
    },
  };
};

export { clamp as clampScroll };
