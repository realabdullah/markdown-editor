import type { ThemeDefinition } from "~/types/theme";

export const daylight: ThemeDefinition = {
  id: "daylight",
  name: "Daylight",
  description: "Cool slate greys with a blue accent. Crisp and high contrast.",
  appearance: "light",
  shadows: { panel: "0 20px 60px -40px rgba(15, 23, 42, 0.65)" },
  tokens: {
    "surface-app": "242 245 249", // #f2f5f9
    "surface-panel": "255 255 255", // #ffffff
    "surface-sunken": "248 250 252", // #f8fafc
    "surface-raised": "238 242 247", // #eef2f7
    "surface-overlay": "15 23 42", // #0f172a

    line: "226 232 240", // #e2e8f0
    "line-strong": "203 213 225", // #cbd5e1
    "line-subtle": "241 245 249", // #f1f5f9

    ink: "15 23 42", // #0f172a
    "ink-muted": "71 85 105", // #475569
    "ink-subtle": "100 116 139", // #64748b
    "ink-inverted": "248 250 252", // #f8fafc

    accent: "37 99 235", // #2563eb
    "accent-hover": "29 78 216", // #1d4ed8
    "accent-fg": "255 255 255", // #ffffff
    focus: "37 99 235", // #2563eb
    selection: "147 197 253", // #93c5fd
    "selection-fg": "15 23 42", // #0f172a
    "scrollbar-thumb": "148 163 184", // #94a3b8

    "danger-surface": "254 242 242", // #fef2f2
    "danger-border": "252 165 165", // #fca5a5
    "danger-fg": "185 28 28", // #b91c1c
    "warning-surface": "255 251 235", // #fffbeb
    "warning-border": "252 211 77", // #fcd34d
    "warning-fg": "146 64 14", // #92400e
    "success-surface": "236 253 245", // #ecfdf5
    "success-border": "110 231 183", // #6ee7b7
    "success-fg": "4 120 87", // #047857

    "editor-bg": "255 255 255", // #ffffff
    "editor-fg": "15 23 42", // #0f172a
    "editor-caret": "37 99 235", // #2563eb
    "editor-gutter": "148 163 184", // #94a3b8
    "editor-gutter-active": "71 85 105", // #475569
    "editor-active-line": "248 250 252", // #f8fafc
    "editor-selection": "143 166 196", // #8fa6c4
    "editor-selection-match": "203 213 225", // #cbd5e1
    "editor-panel": "241 245 249", // #f1f5f9
    "editor-panel-border": "226 232 240", // #e2e8f0

    "syn-heading": "15 23 42", // #0f172a
    "syn-emphasis": "51 65 85", // #334155
    "syn-strong": "15 23 42", // #0f172a
    "syn-link": "29 78 216", // #1d4ed8
    "syn-url": "100 116 139", // #64748b
    "syn-code": "190 24 93", // #be185d
    "syn-quote": "71 85 105", // #475569
    "syn-marker": "148 163 184", // #94a3b8
    "syn-keyword": "124 58 237", // #7c3aed
    "syn-string": "4 120 87", // #047857
    "syn-comment": "100 116 139", // #64748b
  },
};
