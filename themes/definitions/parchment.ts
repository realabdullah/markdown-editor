import type { ThemeDefinition } from "~/types/theme";

export const parchment: ThemeDefinition = {
  id: "parchment",
  name: "Parchment",
  description: "Warm sepia paper and ink brown. Easy on the eyes for long reads.",
  appearance: "light",
  shadows: { panel: "0 20px 60px -40px rgba(74, 59, 40, 0.6)" },
  tokens: {
    "surface-app": "246 241 231", // #f6f1e7
    "surface-panel": "255 253 247", // #fffdf7
    "surface-sunken": "241 234 217", // #f1ead9
    "surface-raised": "236 227 206", // #ece3ce
    "surface-overlay": "59 51 42", // #3b332a

    line: "224 213 189", // #e0d5bd
    "line-strong": "203 187 155", // #cbbb9b
    "line-subtle": "239 232 214", // #efe8d6

    ink: "59 51 42", // #3b332a
    "ink-muted": "95 83 67", // #5f5343
    "ink-subtle": "133 119 97", // #857761
    "ink-inverted": "255 253 247", // #fffdf7

    accent: "138 90 52", // #8a5a34
    "accent-hover": "111 71 42", // #6f472a
    "accent-fg": "255 253 247", // #fffdf7
    focus: "138 90 52", // #8a5a34
    selection: "203 187 155", // #cbbb9b
    "selection-fg": "59 51 42", // #3b332a
    "scrollbar-thumb": "168 151 122", // #a8977a

    "danger-surface": "251 234 230", // #fbeae6
    "danger-border": "224 169 155", // #e0a99b
    "danger-fg": "143 44 26", // #8f2c1a
    "warning-surface": "251 241 220", // #fbf1dc
    "warning-border": "217 180 106", // #d9b46a
    "warning-fg": "122 83 26", // #7a531a
    "success-surface": "233 242 228", // #e9f2e4
    "success-border": "157 191 140", // #9dbf8c
    "success-fg": "60 95 44", // #3c5f2c

    "editor-bg": "255 253 247", // #fffdf7
    "editor-fg": "59 51 42", // #3b332a
    "editor-caret": "138 90 52", // #8a5a34
    "editor-gutter": "184 168 136", // #b8a888
    "editor-gutter-active": "95 83 67", // #5f5343
    "editor-active-line": "250 245 233", // #faf5e9
    "editor-selection": "184 168 136", // #b8a888
    "editor-selection-match": "203 187 155", // #cbbb9b
    "editor-panel": "241 234 217", // #f1ead9
    "editor-panel-border": "224 213 189", // #e0d5bd

    "syn-heading": "59 51 42", // #3b332a
    "syn-emphasis": "95 83 67", // #5f5343
    "syn-strong": "59 51 42", // #3b332a
    "syn-link": "31 95 107", // #1f5f6b
    "syn-url": "133 119 97", // #857761
    "syn-code": "143 44 26", // #8f2c1a
    "syn-quote": "107 92 72", // #6b5c48
    "syn-marker": "184 168 136", // #b8a888
    "syn-keyword": "122 62 143", // #7a3e8f
    "syn-string": "60 95 44", // #3c5f2c
    "syn-comment": "133 119 97", // #857761
  },
};
