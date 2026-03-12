# Project R

Project R is a dedicated repository for the next-generation Crack service. It is split into:

- `apps/web`: Next.js web product for discovery, creation, and live operations.
- `apps/mobile`: Expo React Native app that ships separate Android and iOS builds.

## Product framing

This repository now includes a locally usable product shell built around:

- Story: world-scale interactive fiction where the user becomes the protagonist.
- Character: short-form conversation loops optimized for fast emotional engagement.
- Party Chat: synchronous multiplayer story rooms with AI-led turn resolution.
- Image Studio: prompt-driven scene card generation for fast visual iteration.
- Creator Console: publishing queue, pricing setup, and launch templates.
- Safety and Memory: policy-aware generation, long-term memory, and moderation tooling.

## What works now

- Web landing plus a playable `/app` product shell
- Discover feed with selectable flagship content
- Story choice flow with progression log
- Character chat flow with local response generation
- Party room action resolution log
- Image prompt studio with generated visual cards
- Creator queue with release drafts and revenue projection
- Mobile app with the same core tabs and local interaction loops

## Commands

```bash
npm run dev:web
npm run build:web
npm run lint:web
npm run dev:mobile
npm run android
npm run ios
```

## Runtime note

Use Node `22.13.1` or newer. On this machine, `22.12.0` crashed `eslint`, `next build`, and `tsc` with Windows access violation `0xC0000005`.

## Repository policy

- Remote repository: [gogoleelee88/projectR](https://github.com/gogoleelee88/projectR)
- Primary branch: `main`
- Active working branch: `codex/bootstrap-projectr`

## Next steps

1. Replace local state with real auth, feed, chat, image, and commerce APIs.
2. Add persistent storage and syncing between web and mobile sessions.
3. Add CI, visual regression checks, analytics, crash reporting, and release automation.
