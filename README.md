# Project R

Project R is a dedicated repository for the next-generation Crack service. It is split into:

- `apps/api`: FastAPI backend for auth bootstrap, feed, play, studio, creator, and ops endpoints.
- `apps/web`: Next.js web product for discovery, creation, and live operations.
- `apps/mobile`: Expo React Native app that ships separate Android and iOS builds.

## Product framing

This repository now includes a locally usable product shell built around:

- Story: world-scale interactive fiction where the user becomes the protagonist.
- Character: short-form conversation loops optimized for fast emotional engagement.
- Party Chat: synchronous multiplayer story rooms with invite codes, WebSocket sync, and AI-led turn resolution.
- Image Studio: prompt-driven scene card generation for fast visual iteration.
- Creator Console: publishing queue, pricing setup, and launch templates.
- Safety and Memory: policy-aware generation, long-term memory, and moderation tooling.

## What works now

- FastAPI backend with health, auth, feed, story, chat, party, studio, creator, billing, and ops endpoints
- Web landing plus a playable `/app` product shell
- Direct email signup, login, session restore, and logout in the web app
- Discover feed with selectable flagship content
- Story choice flow with progression log
- Character chat flow with fallback responses plus optional live chat webhook adapter
- Realtime party rooms with invite codes, live participants, and synchronized room logs
- Image prompt studio with generated visual cards plus optional live image webhook adapter
- Creator queue with release drafts and revenue projection
- Membership checkout with subscription records and optional live billing webhook adapter
- Mobile app with the same core tabs and local interaction loops

## Optional live adapters

If you already operate external AI or billing services, point the API at them with these environment variables:

```bash
PROJECTR_CHAT_WEBHOOK_URL=https://your-service.example/chat
PROJECTR_STUDIO_WEBHOOK_URL=https://your-service.example/studio
PROJECTR_BILLING_WEBHOOK_URL=https://your-service.example/checkout
```

Each webhook is expected to accept JSON POST requests and return the normalized response fields used by the API.

## Commands

```bash
npm run dev:api
npm run check:api
npm run dev:web
npm run build:web
npm run lint:web
npm run dev:mobile
npm run android
npm run ios
```

## Runtime note

Use Node `22.13.1` or newer. On this machine, `22.12.0` crashed `eslint`, `next build`, and `tsc` with Windows access violation `0xC0000005`.

## Windows local run note

On this machine, Next.js only built and served reliably from an ASCII-only path. If the repo lives under a folder with non-ASCII characters, map it to a drive letter first and run the web app from that drive:

```powershell
subst X: "<repo path>"
cd /d X:\apps\web
npx --yes --package=node@22.19.0 node .\node_modules\next\dist\bin\next build --webpack
npx --yes --package=node@22.19.0 node .\node_modules\next\dist\bin\next start --hostname 127.0.0.1 --port 3013
```

The build and `next start` flow above were verified successfully from `X:\apps\web`.

## Repository policy

- Remote repository: [gogoleelee88/projectR](https://github.com/gogoleelee88/projectR)
- Primary branch: `main`
- Active working branch: `codex/bootstrap-projectr`

## Next steps

1. Replace webhook adapters with production AI, billing, analytics, and moderation providers.
2. Add persistent realtime party storage and recovery across server restarts.
3. Add CI, visual regression checks, analytics, crash reporting, and release automation.
