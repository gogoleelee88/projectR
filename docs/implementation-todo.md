# Project R Implementation TODO

Last updated: 2026-03-13

This file is the working order of execution. Items are implemented in sequence and only moved after the previous step reaches a usable product state.

- [x] 1. Profile and Save
  - Account profile view/edit
  - Saved items library
  - Save/unsave from feed and detail pages
  - Web UI and API wiring
- [x] 2. Story Play UI
  - Branching story screen
  - Choice progression
  - Continue/resume state
- [ ] 3. Character Chat UI
  - Full chat screen
  - Character switcher
  - Session history and save state
- [ ] 4. Image Generation UI
  - Prompt composer
  - Style picker
  - Generated gallery and saved outputs
- [ ] 5. Creator Editor
  - Draft editor
  - Update/publish workflow
  - Release queue and moderation handoff
- [ ] 6. Store and Live Billing Integration
  - Real checkout provider wiring
  - Store surfaces and rewards
  - Purchase/subscription history
- [ ] 7. Mobile API Integration
  - Android/iOS auth
  - Feed/detail/profile/save sync
  - Party/chat/image live flows

## Execution Log

- Completed: Step 1 `Profile and Save`
- Added: profile API, saved library API, home feed save buttons, detail save toggle, profile drawer
- Completed: Step 2 `Story Play UI`
- Added: dedicated `/story/[workId]` player, local continue state, story API-driven choice progression
- Refined: `millennium` upgraded to a curated campaign with chapter map, objective board, cast rail, and ending report
- Refined: story runtime now stores completed runs, replay suggestions, and season report stats
- Refined: logged-in players now sync story progress to the API and unlock ending rewards with spark payouts
- Refined: dedicated character chat player now supports account sync, bond progression, and unlock rewards
