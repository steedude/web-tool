# web-tool

Nuxt 4 starter with TypeScript, Pinia, persisted state, i18n, Tailwind CSS 4, and ESLint.

## Setup

```bash
pnpm install
pnpm dev
```

The development server runs at `http://localhost:3000`.

## Supabase setup

Open the Supabase SQL Editor, paste the full content of `supabase/setup.sql`, and run it once.

The setup SQL creates the `short_links` table, row-level security policy, and RPC functions used by short links, previews, and password-protected redirects.

## Commands

```bash
pnpm dev        # Start the development server
pnpm build      # Create a production build
pnpm typecheck  # Check TypeScript types
pnpm lint       # Check code style
pnpm lint:fix   # Check and automatically fix code style
```

## Code style

This project uses Anthony Fu's opinionated `@antfu/eslint-config`. ESLint handles both code-quality rules and formatting, so Prettier is intentionally not installed.

Install the recommended VS Code extensions when prompted. The workspace settings run ESLint fixes whenever a file is saved.

## Structure

- `app/assets/css/main.css`: Tailwind CSS entry point and theme tokens
- `app/stores`: auto-imported Pinia stores
- `i18n/locales`: translation files
- `eslint.config.mjs`: ESLint and formatting rules
- `.vscode/settings.json`: ESLint fix on save
