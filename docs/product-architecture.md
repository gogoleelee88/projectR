# Project R Architecture Notes

## Scope

Project R is not a PWA wrapper. It is a three-surface product line:

- Web control center for discovery, creation, and operations
- Android app for high-frequency consumption and chat
- iOS app for premium content discovery and creator fandom loops

## Current service mapping

The baseline implementation maps the currently visible Crack service shape into six product modules:

1. Story
   The large-world interactive fiction layer where a user becomes the protagonist.
2. Character
   Fast conversation-first content with low-friction repeat sessions.
3. Party Chat
   Multiplayer turn-based sessions resolved by AI after all players act.
4. Image Studio
   Standalone generation plus in-context scene image rendering.
5. Creator Console
   Publishing, ranking, spotlight placement, rewards, and commerce.
6. Trust Layer
   Safety policy, moderation, memory, and operational controls.

## Delivery posture

- Web is the authoring and merchandising hub.
- Mobile is the habit-forming daily surface.
- Shared strategy is expressed in product language and IA first, then backed by API contracts.

## What this repository includes now

- A FastAPI backend service for auth bootstrap, feed, play, studio, creator, and ops endpoints
- A brand landing and service hub for the public-facing web
- A locally interactive web product shell with discover, story, chat, party, studio, creator, and ops flows
- A mobile app shell with matching discover, story, chat, studio, and creator tabs
- Documentation that fixes repository intent and launch direction

## What is deliberately deferred

- Real authentication and user state
- Live chat transport
- Purchase flows and wallet settlement
- Ranking computation and recommendation systems
- Moderation queues and policy tooling

Those should be added after domain models, compliance requirements, and operating metrics are agreed.
