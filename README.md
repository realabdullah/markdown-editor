# Markdown Editor

A Markdown editor that works without an account and lets you save documents on this device or access and share them across devices when you sign in.

## Technical overview

- Framework: Nuxt 4, Vue 3.5
- State: Nuxt `useState` composables
- Editor: CodeMirror 6
- Markdown pipeline: `markdown-it` + `isomorphic-dompurify`
- Authentication and database: Supabase Auth + Postgres with RLS
- Persistence: IndexedDB for guests, Postgres for accounts, scoped local draft recovery
- Backend: Nuxt/Nitro API routes
- UI: Tailwind CSS + `@tailwindcss/typography`

## Requirements

- Node.js 22+
- pnpm 10+ (or npm/yarn equivalent)
- A Supabase project for account and sharing features

## Setup

Install dependencies and create local environment settings:

```bash
pnpm install
cp .env.example .env
```

Set the following values from the Supabase project Connect dialog:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NUXT_SUPABASE_SECRET_KEY` — server-only; never expose this value to the browser
- `NUXT_RATE_LIMIT_PEPPER` — a long random secret used to hash rate-limit identities

Apply the committed database migration:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

In Supabase Auth settings:

1. Enable email magic-link authentication and Google OAuth.
2. Add `http://localhost:3000/auth/callback` for development.
3. Add `https://<production-domain>/auth/callback` and preview callback URLs used by the deployment.
4. Configure custom SMTP before relying on branded or production-volume sign-in emails.

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
- `pnpm run lint` - Run ESLint
- `pnpm run typecheck` - Run Nuxt type checking

## How documents are saved

- You can create and edit documents without signing in. These documents remain on your device.
- When you sign in, new documents are saved to your account and are available on your other devices.
- Documents already on a device are added to your account only when you select them. They remain on that device until you remove them.
- Anyone with a shared link can read the saved document. Later changes remain private until you share again.
- Disabling a shared link makes it unavailable. Sharing the document again creates a new link.

## Deployment

Build:

```bash
pnpm run build
```

Vercel should run the Nuxt build directly:

```bash
pnpm run build
```

Configure all four Nuxt environment variables independently for preview and production. Add the corresponding Auth callback URLs to Supabase. Enable database backups or point-in-time recovery at the level appropriate for the deployment.

The Dockerfile remains available for a Node-hosted deployment and runs `.output/server/index.mjs` on Node 22.

## Security and limits

- Each document can contain up to 1 MiB of content. Each account can hold up to 500 documents.
- Only the signed-in account can access its saved documents.
- Shared documents are not listed publicly, but anyone with the link can read them.
- Raw HTML in Markdown is disabled, and rendered content is sanitized before display.
- Images from other websites may let those sites see a reader's IP address.
- Deleting an account removes its documents and disables all shared links. This cannot be undone.
