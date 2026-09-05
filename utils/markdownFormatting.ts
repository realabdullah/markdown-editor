/**
 * Pure text transforms behind the editor's formatting commands. They take the
 * document and a selection range and return the new document with the range the
 * editor should select afterwards, so they can be tested without CodeMirror.
 */
export interface FormatResult {
  text: string;
  from: number;
  to: number;
}

export type InlineMarker = "**" | "*" | "~~" | "`";

const lineStartAt = (text: string, index: number) =>
  text.lastIndexOf("\n", Math.max(index - 1, 0)) + 1;

const lineEndAt = (text: string, index: number) => {
  const end = text.indexOf("\n", index);
  return end === -1 ? text.length : end;
};

/** Wraps the selection in `marker`, or unwraps it when it is already wrapped. */
export const toggleInlineMarker = (
  text: string,
  from: number,
  to: number,
  marker: InlineMarker,
): FormatResult => {
  const selected = text.slice(from, to);
  const width = marker.length;

  if (
    selected.length >= width * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(width, -width);
    return {
      text: text.slice(0, from) + inner + text.slice(to),
      from,
      to: from + inner.length,
    };
  }

  if (text.slice(from - width, from) === marker && text.slice(to, to + width) === marker) {
    return {
      text: text.slice(0, from - width) + selected + text.slice(to + width),
      from: from - width,
      to: to - width,
    };
  }

  return {
    text: text.slice(0, from) + marker + selected + marker + text.slice(to),
    from: from + width,
    to: to + width,
  };
};

const selectedLineRange = (text: string, from: number, to: number) => {
  const start = lineStartAt(text, from);
  const end = lineEndAt(text, to);
  return { start, end, lines: text.slice(start, end).split("\n") };
};

/**
 * Applies `transform` to every selected line. When each line already carries the
 * prefix the transform would add, the prefix is removed instead.
 */
const mapSelectedLines = (
  text: string,
  from: number,
  to: number,
  transform: (line: string, index: number) => string,
): FormatResult => {
  const { start, end, lines } = selectedLineRange(text, from, to);
  const replacement = lines.map(transform).join("\n");
  return {
    text: text.slice(0, start) + replacement + text.slice(end),
    from: start,
    to: start + replacement.length,
  };
};

const HEADING = /^(#{1,6})\s+/;

export const toggleHeading = (
  text: string,
  from: number,
  to: number,
  level: number,
): FormatResult => {
  const prefix = `${"#".repeat(level)} `;
  const { lines } = selectedLineRange(text, from, to);
  const alreadySet = lines.every((line) => line.startsWith(prefix));

  return mapSelectedLines(text, from, to, (line) => {
    const bare = line.replace(HEADING, "");
    return alreadySet ? bare : `${prefix}${bare}`;
  });
};

const BULLET = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?/;
const ORDERED = /^\s*\d+\.\s+/;
const QUOTE = /^\s*>\s?/;
const TASK = /^(\s*[-*+]\s+)\[([ xX])\]\s+/;

export const toggleBulletList = (text: string, from: number, to: number) => {
  const { lines } = selectedLineRange(text, from, to);
  const alreadySet = lines.every((line) => BULLET.test(line));
  return mapSelectedLines(text, from, to, (line) =>
    alreadySet ? line.replace(BULLET, "") : `- ${line.replace(ORDERED, "")}`,
  );
};

export const toggleOrderedList = (text: string, from: number, to: number) => {
  const { lines } = selectedLineRange(text, from, to);
  const alreadySet = lines.every((line) => ORDERED.test(line));
  return mapSelectedLines(text, from, to, (line, index) =>
    alreadySet
      ? line.replace(ORDERED, "")
      : `${index + 1}. ${line.replace(BULLET, "")}`,
  );
};

/** Adds `- [ ]`, ticks an unchecked item, or unticks a checked one. */
export const toggleTaskItem = (text: string, from: number, to: number) =>
  mapSelectedLines(text, from, to, (line) => {
    const task = TASK.exec(line);
    if (task) {
      const state = task[2]?.toLowerCase() === "x" ? " " : "x";
      return line.replace(TASK, `$1[${state}] `);
    }
    const bullet = BULLET.exec(line);
    return bullet ? `${bullet[0]}[ ] ${line.slice(bullet[0].length)}` : `- [ ] ${line}`;
  });

export const toggleBlockquote = (text: string, from: number, to: number) => {
  const { lines } = selectedLineRange(text, from, to);
  const alreadySet = lines.every((line) => QUOTE.test(line));
  return mapSelectedLines(text, from, to, (line) =>
    alreadySet ? line.replace(QUOTE, "") : `> ${line}`,
  );
};

/** Selection becomes the link text; the cursor lands inside the empty target. */
export const insertLink = (
  text: string,
  from: number,
  to: number,
  href = "",
): FormatResult => {
  const label = text.slice(from, to) || "link";
  const snippet = `[${label}](${href})`;
  const cursor = from + label.length + 3;
  return {
    text: text.slice(0, from) + snippet + text.slice(to),
    from: cursor,
    to: cursor + href.length,
  };
};

export const insertCodeBlock = (
  text: string,
  from: number,
  to: number,
  language = "",
): FormatResult => {
  const { start, end } = selectedLineRange(text, from, to);
  const body = text.slice(start, end);
  const snippet = `\`\`\`${language}\n${body}\n\`\`\``;
  return {
    text: text.slice(0, start) + snippet + text.slice(end),
    from: start + language.length + 4,
    to: start + language.length + 4 + body.length,
  };
};

/** Inserts a starter table above the current line, selecting its first header. */
export const insertTable = (text: string, from: number): FormatResult => {
  const start = lineStartAt(text, from);
  const snippet = "| Column | Column |\n| --- | --- |\n| Cell | Cell |\n";
  return {
    text: text.slice(0, start) + snippet + text.slice(start),
    from: start + 2,
    to: start + 8,
  };
};
