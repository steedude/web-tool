# web-tool

A Nuxt 4 utility site for quick browser-based tools:

- Short links with optional metadata, expiration, QR code, and password protection
- Image links with upload, preview page, expiration, and optional password protection
- Peer-to-peer file transfer powered by WebRTC
- Draw & Guess rooms powered by a small WebSocket signaling service

## Stack

- Nuxt 4, Vue 3, TypeScript
- Tailwind CSS 4
- `@nuxtjs/i18n` for Traditional Chinese and English routes
- Supabase Postgres, RPC, and Storage for links and uploaded images
- A standalone Node/WebSocket realtime service in `services/realtime`
- Vitest and ESLint

## Setup

```bash
pnpm install
pnpm dev
```

The Nuxt development server runs at `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
NUXT_PUBLIC_SITE_URL=https://3854335.com
SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id
SENTRY_ENVIRONMENT=production
NUXT_PUBLIC_SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NUXT_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NUXT_PUBLIC_REALTIME_URL=wss://ws.example.com/ws
NUXT_PUBLIC_TURN_URL=turn:turn.example.com:3478
NUXT_PUBLIC_TURN_USERNAME=your-turn-username
NUXT_PUBLIC_TURN_CREDENTIAL=your-turn-password
```

`NUXT_SUPABASE_SERVICE_ROLE_KEY` is used only on the server side. Keep it out of client code and never commit `.env`.
`SENTRY_DSN` enables server-side Nuxt and realtime service error reporting. `NUXT_PUBLIC_SENTRY_DSN` enables browser-side reporting; the DSN is public by design.

## Supabase

Run `supabase/setup.sql` in the Supabase SQL Editor.

The setup script creates:

- `short_links` and `image_links`
- Row-level security policies
- RPC functions for creating and resolving links
- The `link-images` public storage bucket
- Storage policies for public image upload and read access

Run the SQL again after pulling schema changes. It is written to be idempotent.

## Realtime Service

The WebSocket signaling service lives in `services/realtime`.

```bash
pnpm --dir services/realtime dev
```

Useful commands:

```bash
pnpm --dir services/realtime build
pnpm --dir services/realtime start
pnpm --dir services/realtime typecheck
```

The service exposes:

- `GET /health`
- `WS /ws`

Configure host and port with:

```bash
HOST=127.0.0.1
PORT=3001
```

Deployment examples are in `deploy/`.

## Commands

```bash
pnpm dev        # Start Nuxt in development
pnpm build      # Build the Nuxt app
pnpm generate   # Generate static output where possible
pnpm preview    # Preview a built Nuxt app
pnpm lint       # Run ESLint
pnpm lint:fix   # Run ESLint with fixes
pnpm test       # Run Vitest
pnpm typecheck  # Run Nuxt type checks
```

## Project Structure

- `app/pages`: Nuxt pages for home, links, image links, drop, and draw
- `app/components`: UI components grouped by feature
- `app/composables`: browser-side feature logic
- `app/configs`: client-safe feature configuration
- `server/api`: Nuxt server API routes
- `server/routes`: custom server routes such as redirects and sitemap
- `server/utils`: server-side Supabase, link, and page helpers
- `services/realtime`: standalone WebSocket signaling service
- `supabase/setup.sql`: database, RPC, policy, and storage setup
- `deploy`: deployment assets for Caddy and the realtime systemd service

## Notes

Image-link creation uploads the file to Supabase Storage, then creates the image page and short-link records through a single database RPC. If the database step fails after upload, the server attempts to delete the uploaded object so Storage does not accumulate orphan files.
