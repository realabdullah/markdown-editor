import type { ThemeDefinition } from "~/types/theme";

export const graphite: ThemeDefinition = {
  id: "graphite",
  name: "Graphite",
  description: "Near-black neutrals. The original dark theme.",
  appearance: "dark",
  shadows: { panel: "0 20px 60px -30px rgba(0, 0, 0, 0.9)" },
  tokens: {
    "surface-app": "10 10 10", // #0a0a0a
    "surface-panel": "9 9 11", // #09090b
    "surface-sunken": "24 24 27", // #18181b
    "surface-raised": "24 24 27", // #18181b
    "surface-overlay": "9 9 11", // #09090b

    line: "39 39 42", // #27272a
    "line-strong": "63 63 70", // #3f3f46
    "line-subtle": "24 24 27", // #18181b

    ink: "244 244 245", // #f4f4f5
    "ink-muted": "161 161 170", // #a1a1aa
    "ink-subtle": "113 113 122", // #71717a
    "ink-inverted": "9 9 11", // #09090b

    accent: "244 244 245", // #f4f4f5
    "accent-hover": "228 228 231", // #e4e4e7
    "accent-fg": "9 9 11", // #09090b
    focus: "113 113 122", // #71717a
    selection: "63 63 70", // #3f3f46
    "selection-fg": "244 244 245", // #f4f4f5
    "scrollbar-thumb": "63 63 70", // #3f3f46

    "danger-surface": "69 10 10", // #450a0a
    "danger-border": "127 29 29", // #7f1d1d
    "danger-fg": "254 202 202", // #fecaca
    "warning-surface": "69 26 3", // #451a03
    "warning-border": "120 53 15", // #78350f
    "warning-fg": "253 230 138", // #fde68a
    "success-surface": "2 44 34", // #022c22
    "success-border": "6 95 70", // #065f46
    "success-fg": "167 243 208", // #a7f3d0

    "editor-bg": "10 10 10", // #0a0a0a
    "editor-fg": "244 244 245", // #f4f4f5
    "editor-caret": "255 255 255", // #ffffff
    "editor-gutter": "82 82 91", // #52525b
    "editor-gutter-active": "212 212 216", // #d4d4d8
    "editor-active-line": "10 10 10", // matches the pane: no visible highlight
    "editor-selection": "161 161 170", // #a1a1aa
    "editor-selection-match": "82 82 91", // #52525b
    "editor-panel": "24 24 27", // #18181b
    "editor-panel-border": "39 39 42", // #27272a

    "syn-heading": "250 250 250", // #fafafa
    "syn-emphasis": "212 212 216", // #d4d4d8
    "syn-strong": "250 250 250", // #fafafa
    "syn-link": "147 197 253", // #93c5fd
    "syn-url": "161 161 170", // #a1a1aa
    "syn-code": "249 168 212", // #f9a8d4
    "syn-quote": "161 161 170", // #a1a1aa
    "syn-marker": "82 82 91", // #52525b
    "syn-keyword": "216 180 254", // #d8b4fe
    "syn-string": "134 239 172", // #86efac
    "syn-comment": "113 113 122", // #71717a
  },
};
