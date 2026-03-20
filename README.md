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
- Payment-intent settlement layer with Stripe checkout/webhooks, App Store verification, and Google Play verification hooks

## Optional live adapters

If you already operate external AI or billing services, point the API at them with these environment variables:

```bash
PROJECTR_CHAT_WEBHOOK_URL=https://your-service.example/chat
PROJECTR_STUDIO_WEBHOOK_URL=https://your-service.example/studio
PROJECTR_BILLING_WEBHOOK_URL=https://your-service.example/checkout
PROJECTR_PAYMENT_VERIFY_WEBHOOK_URL=https://your-service.example/payment-verify
```

Each webhook is expected to accept JSON POST requests and return the normalized response fields used by the API.

## Live commerce providers

Stripe web checkout:

```bash
PROJECTR_STRIPE_SECRET_KEY=sk_live_...
PROJECTR_STRIPE_PUBLISHABLE_KEY=pk_live_...
PROJECTR_STRIPE_WEBHOOK_SECRET=whsec_...
PROJECTR_STRIPE_SUCCESS_URL=https://your-web.example/store?checkout=success&session_id={CHECKOUT_SESSION_ID}
PROJECTR_STRIPE_CANCEL_URL=https://your-web.example/store?checkout=cancel
NEXT_PUBLIC_WEB_PAYMENT_PROVIDER=stripe
```

App Store Server API:

```bash
PROJECTR_APPLE_ISSUER_ID=...
PROJECTR_APPLE_KEY_ID=...
PROJECTR_APPLE_BUNDLE_ID=com.example.projectr
PROJECTR_APPLE_PRIVATE_KEY_PATH=C:\\keys\\AuthKey_ABC123XYZ.p8
PROJECTR_APPLE_ENVIRONMENT=sandbox
EXPO_PUBLIC_MOBILE_BILLING_PROVIDER=app-store
EXPO_PUBLIC_APPLE_ENVIRONMENT=sandbox
```

Google Play Billing:

```bash
PROJECTR_GOOGLE_SERVICE_ACCOUNT_JSON_PATH=C:\\keys\\google-play-service-account.json
PROJECTR_GOOGLE_PACKAGE_NAME=com.example.projectr
EXPO_PUBLIC_MOBILE_BILLING_PROVIDER=play-billing
```

Operational notes:

- Web `stripe` purchases create a hosted Stripe Checkout Session and settle through `POST /webhooks/stripe`.
- Mobile `app-store` confirmation expects `transactionId` or `originalTransactionId`.
- Mobile `play-billing` confirmation expects `purchaseToken` and `packageName`.
- Optional provider bridge writes can use `X-ProjectR-Webhook-Key` with `PROJECTR_PROVIDER_WEBHOOK_KEY`.
- Operators can monitor payment health through `GET /payments/incidents` and `GET /payments/ops/summary`.

## Commands

```bash
npm run dev:api
npm run check:api
npm run dev:web
npm run build:web
npm run start:web
npm run lint:web
npm run dev:mobile
npm run android
npm run ios
```

## Runtime note

Use Node `22.13.1` or newer. On this machine, `22.12.0` crashed `eslint`, `next build`, and `tsc` with Windows access violation `0xC0000005`.

## Windows local run note

On this machine, `next dev` hit an upstream Windows manifest access bug when the repo was served directly from the Desktop / OneDrive path. The root launcher now handles this automatically:

```powershell
npm run dev:web
```

What it does on Windows:

- pins the web runtime to `node@22.19.0`
- creates a temporary ASCII-only drive mapping if the repo path contains non-ASCII characters
- runs a production-style `next build` and `next start` flow on `127.0.0.1:3013`

This avoids the known `UNKNOWN ... _buildManifest.js` dev-runtime failure while keeping the actual app build unchanged.

## Repository policy

- Remote repository: [gogoleelee88/projectR](https://github.com/gogoleelee88/projectR)
- Primary branch: `main`
- Active working branch: `codex/bootstrap-projectr`

## Next steps

1. Replace webhook adapters with production AI, billing, analytics, and moderation providers.
2. Add persistent realtime party storage and recovery across server restarts.
3. Add CI, visual regression checks, analytics, crash reporting, and release automation.
