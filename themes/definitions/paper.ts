import type { ThemeDefinition } from "~/types/theme";

export const paper: ThemeDefinition = {
  id: "paper",
  name: "Paper",
  description: "Neutral greys on white. The original light theme.",
  appearance: "light",
  shadows: { panel: "0 20px 60px -40px rgba(0, 0, 0, 0.75)" },
  tokens: {
    "surface-app": "244 244 245", // #f4f4f5
    "surface-panel": "255 255 255", // #ffffff
    "surface-sunken": "250 250 250", // #fafafa
    "surface-raised": "244 244 245", // #f4f4f5
    "surface-overlay": "9 9 11", // #09090b

    line: "228 228 231", // #e4e4e7
    "line-strong": "212 212 216", // #d4d4d8
    "line-subtle": "244 244 245", // #f4f4f5

    ink: "24 24 27", // #18181b
    "ink-muted": "82 82 91", // #52525b
    "ink-subtle": "113 113 122", // #71717a
    "ink-inverted": "250 250 250", // #fafafa

    accent: "9 9 11", // #09090b
    "accent-hover": "39 39 42", // #27272a
    "accent-fg": "255 255 255", // #ffffff
    focus: "113 113 122", // #71717a
    selection: "63 63 70", // #3f3f46
    "selection-fg": "244 244 245", // #f4f4f5
    "scrollbar-thumb": "63 63 70", // #3f3f46

    "danger-surface": "254 242 242", // #fef2f2
    "danger-border": "252 165 165", // #fca5a5
    "danger-fg": "153 27 27", // #991b1b
    "warning-surface": "255 251 235", // #fffbeb
    "warning-border": "252 211 77", // #fcd34d
    "warning-fg": "120 53 15", // #78350f
    "success-surface": "236 253 245", // #ecfdf5
    "success-border": "110 231 183", // #6ee7b7
    "success-fg": "6 95 70", // #065f46

    "editor-bg": "255 255 255", // #ffffff
    "editor-fg": "24 24 27", // #18181b
    "editor-caret": "24 24 27", // #18181b
    "editor-gutter": "161 161 170", // #a1a1aa
    "editor-gutter-active": "63 63 70", // #3f3f46
    "editor-active-line": "255 255 255", // matches the pane: no visible highlight
    "editor-selection": "143 143 151", // #8f8f97 — at 0.28 alpha, the old 0.22 wash
    "editor-selection-match": "161 161 170", // #a1a1aa
    "editor-panel": "244 244 245", // #f4f4f5
    "editor-panel-border": "228 228 231", // #e4e4e7

    "syn-heading": "24 24 27", // #18181b
    "syn-emphasis": "63 63 70", // #3f3f46
    "syn-strong": "24 24 27", // #18181b
    "syn-link": "29 78 216", // #1d4ed8
    "syn-url": "113 113 122", // #71717a
    "syn-code": "157 23 77", // #9d174d
    "syn-quote": "82 82 91", // #52525b
    "syn-marker": "161 161 170", // #a1a1aa
    "syn-keyword": "126 34 206", // #7e22ce
    "syn-string": "21 128 61", // #15803d
    "syn-comment": "113 113 122", // #71717a
  },
};
