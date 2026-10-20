# UI refinement — artwork-card mode switching

## Direction

This revision keeps the selected design: illustrated artwork cards, category filters and a large featured-mode preview. It focuses on the interface first.

## Changes

- Added previous/next buttons directly on the featured artwork. They cycle within the active category.
- Selecting a category keeps the current mode when it belongs there, otherwise selects the first mode in that category. The preview always matches a visible selected card.
- Category selection survives entering a game and returning to the lobby.
- Added a `Dipilih` badge, mode count, category counts, clearer hover/focus states and difficulty labels.
- Added `Pilihkan aku` to choose another playable mode in the current category. It avoids the already-selected mode and touch-incompatible local 2P modes.
- Added arrow-key, Home and End navigation while a mode card has focus. Mode changes are announced through a quiet status region.
- Previous artwork remains visible while the requested scene loads; images transition once decoded. Text and artwork transitions respect reduced-motion preferences.
- Grouped speed and duration settings more clearly. Duration labels now explicitly say `detik`; Impossible clearly marks its locked speed.
- Added a fixed mobile Play bar with selected mode and effective settings. Tapping its mode summary returns to the preview/settings without unexpectedly moving the page when a card is selected.
- Phone cards now use two columns for larger artwork, readable names and more comfortable touch targets.
- The brand action during gameplay now opens the paused return-to-menu flow instead of opening help.
- The record badge now says `Rekor lokal` to describe its actual storage more accurately.

## Scope

The game engine is byte-for-byte unchanged from the previously delivered redesign. All ten modes, current speed/timer behavior, joystick and sounds are retained. This revision adds no backend, authentication or online multiplayer. Logic and backend improvements remain a separate next phase described by the earlier implementation prompt.

## Verification performed

- `npm run build`: passed.
- Browser checks: all ten modes launch, pause and return to menu.
- Previous/next switching, category/preview consistency, random selection, keyboard card navigation and retained filters: passed.
- Brand action opens the pause/menu flow: passed.
- Time Attack duration selection still reaches the engine: passed.
- Mobile fixed Play button and jump-to-settings action: passed.
- Horizontal-overflow checks at 320, 390, 768 and 1366 pixels: passed.
- Desktop and phone screenshots visually reviewed; no JavaScript page errors during those checks.

Responsive browser checks are not a substitute for testing the final build on a physical Android/iOS device. This UI revision does not claim that the previously documented gameplay edge cases are fixed.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use `npm run build` then `npm start` for production mode.

`design-preview/` contains screenshots of this revision. `REDESIGN.md` describes the earlier redesign; this file describes the changes layered on top of it.
