# Markdown Editor

A private, browser-based workspace for editing Markdown files directly in a local folder.

Markdown Editor is designed for repository documentation, notes, and other collections of `.md` files. Your files stay on your device and remain available to Git, your text editor, and the rest of your existing workflow. There are no accounts, uploads, or cloud sync.

## Features

- Open a local folder and browse its Markdown files
- Create, edit, preview, and save `.md` files
- Search across file names and document contents
- Navigate long documents with an outline and quick open
- Write in editor, split, or reading mode
- Preview GitHub-flavored Markdown, including tables, task lists, fenced code blocks, and strikethrough
- Recover unsaved changes after a reload
- Review conflicts when a file changes outside the editor
- Export documents as Markdown or rendered HTML
- Choose from six built-in themes or follow your system appearance

## Browser support

Markdown Editor requires a desktop version of Google Chrome or Microsoft Edge. Safari, Firefox, and mobile browsers do not support the folder access required to edit local files.

The deployed application must use HTTPS. Local development works on `localhost`.

## Privacy

Your documents remain on your device. The editor does not require an account, store files on a server, or send telemetry. You choose which folder to open, and you can revoke access through your browser at any time.

## Local development

Requirements:

- Node.js 22
- pnpm 10

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

## Available commands

```bash
pnpm dev          # Start the development server
pnpm build        # Create a production build
pnpm preview      # Preview the production build
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
pnpm test         # Run the test suite
```

Before submitting changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
