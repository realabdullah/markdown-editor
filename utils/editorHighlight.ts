import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * Every colour is a custom property, so this one style serves every theme and
 * never has to be reconfigured. It replaces CodeMirror's `defaultHighlightStyle`,
 * which is light-only — under it the dark themes showed light-theme token
 * colours.
 */
export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.heading2, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.heading3, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.heading4, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.heading5, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.heading6, color: "rgb(var(--syn-heading))", fontWeight: "600" },
  { tag: tags.strong, color: "rgb(var(--syn-strong))", fontWeight: "600" },
  { tag: tags.emphasis, color: "rgb(var(--syn-emphasis))", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "rgb(var(--syn-link))", textDecoration: "underline" },
  { tag: tags.url, color: "rgb(var(--syn-url))" },
  { tag: tags.monospace, color: "rgb(var(--syn-code))" },
  { tag: tags.quote, color: "rgb(var(--syn-quote))", fontStyle: "italic" },
  // List bullets, heading hashes, fence delimiters — the Markdown punctuation.
  { tag: tags.processingInstruction, color: "rgb(var(--syn-marker))" },
  { tag: tags.list, color: "rgb(var(--syn-marker))" },
  { tag: tags.contentSeparator, color: "rgb(var(--syn-marker))" },
  // Reached inside fenced code blocks with a recognised language.
  { tag: tags.keyword, color: "rgb(var(--syn-keyword))" },
  { tag: tags.string, color: "rgb(var(--syn-string))" },
  { tag: tags.number, color: "rgb(var(--syn-keyword))" },
  { tag: tags.comment, color: "rgb(var(--syn-comment))", fontStyle: "italic" },
]);
