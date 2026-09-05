/**
 * Values are bare sRGB channels — `"24 24 27"`, never `"rgb(24 24 27)"` — so
 * that Tailwind's `rgb(var(--token) / <alpha-value>)` opacity utilities work.
 * Wrapping the value in `rgb()` here breaks `bg-panel/60` silently: the
 * declaration becomes invalid and is dropped, so the element inherits a colour
 * instead of showing an obvious error.
 *
 * Outside a Tailwind utility — the CodeMirror theme, the typography config, the
 * export stylesheets — write the wrapper yourself: `rgb(var(--surface-panel))`.
 */
export const TOKEN_NAMES = [
  "surface-app",
  "surface-panel",
  "surface-sunken",
  "surface-raised",
  "surface-overlay",

  "line",
  "line-strong",
  "line-subtle",

  "ink",
  "ink-muted",
  "ink-subtle",
  "ink-inverted",

  "accent",
  "accent-hover",
  "accent-fg",
  "focus",
  "selection",
  "selection-fg",
  "scrollbar-thumb",

  "danger-surface",
  "danger-border",
  "danger-fg",
  "warning-surface",
  "warning-border",
  "warning-fg",
  "success-surface",
  "success-border",
  "success-fg",

  // Editor chrome, read only by the CodeMirror theme.
  "editor-bg",
  "editor-fg",
  "editor-caret",
  "editor-gutter",
  "editor-gutter-active",
  "editor-active-line",
  "editor-selection",
  "editor-selection-match",
  "editor-panel",
  "editor-panel-border",

  // Markdown syntax, read only by the CodeMirror highlight style.
  "syn-heading",
  "syn-emphasis",
  "syn-strong",
  "syn-link",
  "syn-url",
  "syn-code",
  "syn-quote",
  "syn-marker",
  "syn-keyword",
  "syn-string",
  "syn-comment",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/**
 * Exhaustive by construction: a theme that omits a token fails to compile,
 * so the runtime completeness check is only a guard against casts.
 */
export type ThemeTokens = Record<TokenName, string>;
