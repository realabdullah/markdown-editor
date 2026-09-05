import type { ThemeDefinition } from "~/types/theme";

export const nocturne: ThemeDefinition = {
  id: "nocturne",
  name: "Nocturne",
  description: "Deep navy slate with a soft cyan accent. Gentle contrast at night.",
  appearance: "dark",
  shadows: { panel: "0 20px 60px -30px rgba(0, 0, 0, 0.85)" },
  tokens: {
    "surface-app": "16 23 32", // #101720
    "surface-panel": "22 31 43", // #161f2b
    "surface-sunken": "12 18 25", // #0c1219
    "surface-raised": "30 41 55", // #1e2937
    "surface-overlay": "5 8 9", // #050809

    line: "38 50 66", // #263242
    "line-strong": "55 69 90", // #37455a
    "line-subtle": "28 37 49", // #1c2531

    ink: "219 228 238", // #dbe4ee
    "ink-muted": "163 177 194", // #a3b1c2
    "ink-subtle": "116 136 160", // #7488a0
    "ink-inverted": "16 23 32", // #101720

    accent: "127 199 217", // #7fc7d9
    "accent-hover": "154 214 229", // #9ad6e5
    "accent-fg": "16 23 32", // #101720
    focus: "127 199 217", // #7fc7d9
    selection: "55 69 90", // #37455a
    "selection-fg": "219 228 238", // #dbe4ee
    "scrollbar-thumb": "55 69 90", // #37455a

    "danger-surface": "58 20 24", // #3a1418
    "danger-border": "127 42 51", // #7f2a33
    "danger-fg": "255 179 186", // #ffb3ba
    "warning-surface": "58 44 16", // #3a2c10
    "warning-border": "125 95 31", // #7d5f1f
    "warning-fg": "255 217 138", // #ffd98a
    "success-surface": "16 47 38", // #102f26
    "success-border": "43 106 85", // #2b6a55
    "success-fg": "147 224 195", // #93e0c3

    "editor-bg": "16 23 32", // #101720
    "editor-fg": "219 228 238", // #dbe4ee
    "editor-caret": "127 199 217", // #7fc7d9
    "editor-gutter": "82 99 121", // #526379
    "editor-gutter-active": "163 177 194", // #a3b1c2
    "editor-active-line": "20 28 39", // #141c27
    "editor-selection": "116 136 160", // #7488a0
    "editor-selection-match": "55 69 90", // #37455a
    "editor-panel": "22 31 43", // #161f2b
    "editor-panel-border": "38 50 66", // #263242

    "syn-heading": "232 240 248", // #e8f0f8
    "syn-emphasis": "194 208 224", // #c2d0e0
    "syn-strong": "232 240 248", // #e8f0f8
    "syn-link": "127 199 217", // #7fc7d9
    "syn-url": "116 136 160", // #7488a0
    "syn-code": "240 168 184", // #f0a8b8
    "syn-quote": "163 177 194", // #a3b1c2
    "syn-marker": "82 99 121", // #526379
    "syn-keyword": "195 166 234", // #c3a6ea
    "syn-string": "159 216 164", // #9fd8a4
    "syn-comment": "116 136 160", // #7488a0
  },
};
