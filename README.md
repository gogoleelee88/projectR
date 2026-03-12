# Project R

Project R is a dedicated repository for the next-generation Crack service. It is split into:

- `apps/web`: Next.js web product for discovery, creation, and live operations.
- `apps/mobile`: Expo React Native app that ships separate Android and iOS builds.

## Product framing

This baseline package turns the current Crack surface into a unified platform around:

- Story: world-scale interactive fiction where the user becomes the protagonist.
- Character: short-form conversation loops optimized for fast emotional engagement.
- Party Chat: synchronous multiplayer story rooms with AI-led turn resolution.
- Image Studio: generation and in-chat scene rendering.
- Creator Console: publishing, analytics, rewards, and store operations.
- Safety and Memory: policy-aware generation, long-term memory, and moderation tooling.

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

1. Connect real backend APIs for auth, feed, chat, image generation, and payments.
2. Split the mobile shell into navigable tabs and native modules once backend contracts settle.
3. Add CI, visual regression checks, analytics, crash reporting, and release automation.
