# Snake Arcade — UI/UX redesign

Based on the latest `Eat-eat-main.zip`, with its ten-mode engine and artwork.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For production: `npm run build`, then `npm start`.

## Interface updates

- Dedicated arcade lobby with ten illustrated mode cards, category filters, mode descriptions, and a featured scene using the latest WebP artwork.
- Speed preferences (Santai, Normal, Ngebut, Konstan), selectable Time Attack durations (30/60/90/120 seconds), and Impossible's locked Ngebut speed.
- Clearer scores, records, multiplayer lives, effects, timer, pause/resume, retry and return-to-menu controls.
- Persistent mute setting, automatic pause when the tab is hidden, and a help dialog that pauses play and supports keyboard focus and Escape.
- Responsive portrait and landscape layouts, existing analog joystick and persistent left-handed layout in landscape. Portrait is no longer blocked by a mandatory rotation prompt; the PWA manifest allows both orientations.
- Reduced-motion menu transitions, visible keyboard focus and improved contrast.
- Time Attack resumes its clock correctly when using a direction key after pausing.

## Preserved from the newest source

Classic, Malam, Portal, Time Attack, Mayhem, Mayhem+, Mayhem Hard, Impossible, 2P Lokal and Mayhem Duo. Night rendering, time-bonus apples, reverse controls, disguised poison, shrinking borders and duo effects remain in the existing engine. Existing sounds, artwork, PWA icons, scores and preference keys are retained.

2P modes require a keyboard (P1 arrows, P2 WASD). On touch-only devices their cards remain visible with an explanation, and Play is disabled. Multiplayer remains local, not online.

The lobby displays immediately; artwork loads directly rather than blocking navigation behind the old full-screen preloader. Previous background/loading components are retained as unused source for reference.

## Customize

- `lib/modes.js`: menu descriptions and color accents.
- `components/Lobby.jsx`: mode browsing and options.
- `app/globals.css`: visual system and responsive layouts.
- `lib/gameEngine.js`: existing gameplay logic.
- `design-preview/`: screenshots of the implemented interface.

Dependency versions are unchanged from the supplied project. Fredoka uses Google Fonts with system-font fallbacks. PWA metadata does not add an offline service worker.

## Verification

Production build passed. Browser checks cover all ten modes starting, pausing, resuming and returning to the menu; category filters; a 30-second Time Attack setting; help and Escape; game over and retry; mute persistence; handedness; and horizontal overflow at 320, 390, 768 and 1366 pixels.
