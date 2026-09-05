import { DEFAULT_DARK_ID, DEFAULT_LIGHT_ID, THEMES_BY_ID } from "~/themes/registry";
import type { ThemeDefinition } from "~/types/theme";
import { tokenDeclarations } from "~/utils/themeCss";

/**
 * Styling for a standalone Markdown document — a downloaded export, or a shared
 * link. It is written by hand rather than extracted from Tailwind's prose
 * output, which cannot be read back at runtime, but it uses the same tokens, so
 * a change to a theme reaches every surface at once.
 */
export const documentStylesheet = (): string => `
*, *::before, *::after { box-sizing: border-box }
body {
  margin: 0;
  padding: 2.5rem 1.25rem 5rem;
  background: rgb(var(--surface-app));
  color: rgb(var(--ink-muted));
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  line-height: 1.75;
}
main { max-width: 72ch; margin: 0 auto }
h1, h2, h3, h4, h5, h6 {
  color: rgb(var(--ink));
  letter-spacing: -0.025em;
  line-height: 1.25;
  margin: 2em 0 0.6em;
}
h1 { font-size: 2em; margin-top: 0 }
h2 { font-size: 1.5em }
h3 { font-size: 1.25em }
p, ul, ol, blockquote, table, pre { margin: 0 0 1.25em }
strong { color: rgb(var(--ink)) }
a { color: rgb(var(--accent)); text-underline-offset: 2px }
img { max-width: 100%; height: auto }
hr { border: 0; border-top: 1px solid rgb(var(--line)); margin: 2.5em 0 }
blockquote {
  margin-left: 0;
  padding-left: 1em;
  border-left: 3px solid rgb(var(--line));
  color: rgb(var(--ink));
  font-style: italic;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875em;
  color: rgb(var(--ink));
  background: rgb(var(--surface-sunken));
  border: 1px solid rgb(var(--line));
  border-radius: 0.25rem;
  padding: 0.125rem 0.3rem;
}
pre {
  overflow: auto;
  padding: 1rem;
  border-radius: 0.5rem;
  background: rgb(var(--surface-sunken));
  border: 1px solid rgb(var(--line));
}
pre code { padding: 0; border: 0; background: none; color: rgb(var(--ink-muted)) }
table { width: 100%; border-collapse: collapse }
th, td { padding: 0.5em 0.75em; text-align: left; border-bottom: 1px solid rgb(var(--line)) }
th { color: rgb(var(--ink)); border-bottom-color: rgb(var(--line-strong)) }
li::marker { color: rgb(var(--ink-subtle)) }
input[type="checkbox"] { accent-color: rgb(var(--accent)) }
.task-list-item { list-style: none }
`.trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** A single theme, for a document the author is downloading. */
const fixedTokens = (theme: ThemeDefinition) => `:root {\n  ${tokenDeclarations(theme)}\n}`;

/**
 * Light and dark, for a document read by someone else: their device decides,
 * because the author's theme says nothing about how a stranger reads.
 */
const dualTokens = () => {
  const light = THEMES_BY_ID.get(DEFAULT_LIGHT_ID)!;
  const dark = THEMES_BY_ID.get(DEFAULT_DARK_ID)!;
  return [
    `:root {\n  ${tokenDeclarations(light)}\n  color-scheme: light dark;\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n  ${tokenDeclarations(dark)}\n  }\n}`,
  ].join("\n");
};

export interface StandaloneOptions {
  title: string;
  /** Already-rendered, already-sanitised HTML. */
  body: string;
  /** Extra tags for <head>. */
  head?: string;
  /** Markup before the article, such as a header bar. */
  chrome?: string;
  extraCss?: string;
  theme?: ThemeDefinition;
}

/**
 * A complete, self-contained HTML document: no stylesheet, font or script is
 * fetched, so it renders the same from a file:// path as from a server.
 */
export const standaloneHtml = (options: StandaloneOptions): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>${options.head ?? ""}
<style>
${options.theme ? fixedTokens(options.theme) : dualTokens()}
${documentStylesheet()}${options.extraCss ? `\n${options.extraCss}` : ""}
</style>
</head>
<body>
${options.chrome ?? ""}<main>${options.body}</main>
</body>
</html>
`;
