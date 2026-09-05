import type { ThemeDefinition } from "~/types/theme";

/**
 * Pure black and white with a saturated accent. Borders are deliberately much
 * lighter than in the other dark themes so structure stays visible, and the
 * panel "shadow" is an outline, because a shadow on black is nothing at all.
 */
export const contrast: ThemeDefinition = {
  id: "contrast",
  name: "High contrast",
  description: "Pure black, white text, a yellow accent. Maximum legibility.",
  appearance: "dark",
  shadows: { panel: "0 0 0 1px rgb(107 107 107)" },
  tokens: {
    "surface-app": "0 0 0", // #000000
    "surface-panel": "11 11 11", // #0b0b0b
    "surface-sunken": "0 0 0", // #000000
    "surface-raised": "31 31 31", // #1f1f1f
    "surface-overlay": "0 0 0", // #000000

    line: "107 107 107", // #6b6b6b
    "line-strong": "160 160 160", // #a0a0a0
    "line-subtle": "61 61 61", // #3d3d3d

    ink: "255 255 255", // #ffffff
    "ink-muted": "237 237 237", // #ededed
    "ink-subtle": "196 196 196", // #c4c4c4
    "ink-inverted": "0 0 0", // #000000

    accent: "255 212 0", // #ffd400
    "accent-hover": "255 225 77", // #ffe14d
    "accent-fg": "0 0 0", // #000000
    focus: "255 212 0", // #ffd400
    selection: "255 212 0", // #ffd400
    "selection-fg": "0 0 0", // #000000
    "scrollbar-thumb": "160 160 160", // #a0a0a0

    "danger-surface": "42 0 0", // #2a0000
    "danger-border": "255 107 107", // #ff6b6b
    "danger-fg": "255 157 157", // #ff9d9d
    "warning-surface": "42 32 0", // #2a2000
    "warning-border": "255 212 0", // #ffd400
    "warning-fg": "255 224 102", // #ffe066
    "success-surface": "0 42 21", // #002a15
    "success-border": "74 222 128", // #4ade80
    "success-fg": "134 239 172", // #86efac

    "editor-bg": "0 0 0", // #000000
    "editor-fg": "255 255 255", // #ffffff
    "editor-caret": "255 212 0", // #ffd400
    "editor-gutter": "138 138 138", // #8a8a8a
    "editor-gutter-active": "255 255 255", // #ffffff
    "editor-active-line": "20 20 20", // #141414
    "editor-selection": "255 212 0", // #ffd400
    "editor-selection-match": "107 107 107", // #6b6b6b
    "editor-panel": "11 11 11", // #0b0b0b
    "editor-panel-border": "107 107 107", // #6b6b6b

    "syn-heading": "255 255 255", // #ffffff
    "syn-emphasis": "237 237 237", // #ededed
    "syn-strong": "255 255 255", // #ffffff
    "syn-link": "102 217 255", // #66d9ff
    "syn-url": "196 196 196", // #c4c4c4
    "syn-code": "255 158 196", // #ff9ec4
    "syn-quote": "237 237 237", // #ededed
    "syn-marker": "138 138 138", // #8a8a8a
    "syn-keyword": "255 212 0", // #ffd400
    "syn-string": "134 239 172", // #86efac
    "syn-comment": "196 196 196", // #c4c4c4
  },
};
