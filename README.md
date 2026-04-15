# Markdown Editor

Markdown editor with local/offline document management and real-time preview.

## Technical Overview

- Framework: Nuxt 4, Vue 3.5
- State: Nuxt `useState` composables
- Editor: CodeMirror 6
- Markdown pipeline: `markdown-it` + `dompurify`
- Persistence: IndexedDB (`idb`) + localStorage draft cache
- UI: Tailwind CSS + `@tailwindcss/typography`

## Requirements

- Node.js 20+ (recommended 22+)
- pnpm 10+ (or npm/yarn equivalent)

## Setup

Install dependencies:

```bash
pnpm install
```

Start development server:

```bash
pnpm run dev
```

Application URL:

- `http://localhost:3000`

## Scripts

- `pnpm run dev` - Start Nuxt development server
- `pnpm run build` - Build production bundle
- `pnpm run preview` - Preview production build
- `pnpm run generate` - Generate static output
- `pnpm run lint` - Run ESLint
- `pnpm run typecheck` - Run Nuxt type checking

## Deployment

Build:

```bash
pnpm run build
```

Run:

```bash
node .output/server/index.mjs
```

## Notes

- Documents are stored locally in browser storage (IndexedDB/localStorage).
