# LovaBuddy - Swayam Parekh & Edward Zhao 

> LovaBuddy is an educational Chrome extension that helps young learners, especially those with diverse needs, transform sketches and ideas into accessible, high‑quality websites.

## What it is

LovaBuddy runs as a friendly overlay on top of the Lovable website builder. It guides kids from a doodle or a short description to a complete website, with gentle prompts, big controls, and accessibility options throughout.

## Highlights

- Kid‑friendly, guided tutorial that teaches tools step‑by‑step (pen, eraser, bucket, save, gallery, describe).
- Playful loading with sprite animation and rotating, whimsical messages (“Sprinkling magic dust…”, “Painting rainbow colors…”, etc.).
- Drawing canvas with shapes (circle/square/star/diamond), colors, eraser, bucket fill, brush size, and a live cursor ring.
- Save drawings to a gallery (click a thumbnail to open; hover to delete). “Saved!” confirmation appears centered.
- Undo/Redo via toolbar buttons (no keyboard shortcuts required).
- Description input with an inline Submit button; pressing Enter works too.
- Congrats flow with a clean “Close” button (non‑tutorial) or “Exit tutorial” (tutorial).
- Accessibility menu (Material Symbols icon) for Large Text, High Contrast, Bold text, and optional TTS hooks.
- Clean centered header branding (icon + “LovaBuddy”) with Fredoka font and rounded UI.
- Launcher/popup validates domain: if you aren’t on Lovable, the button changes to yellow (“Must be on Lovable.dev. Press to open.”) and opens `lovable.dev` in a new tab.

## How it works

- Content script injects an overlay app that renders all UI inside `src/overlay/`.
- A sprite animation (`AnimCycle`) displays during loading, cycling images every 200ms; loading messages rotate every ~4–5 seconds.
- The tutorial overlay appears as a right‑hand pane with typing text, an avatar, and a single Next button; the main app reacts (e.g., opens drawing) at each step.
- Drawings and gallery data are stored in `chrome.storage.local`.

## Directory overview

```
src/
├─ background/                # MV3 service worker
├─ content/                   # Injection + overlay bootstrap
├─ overlay/                   # Full overlay application (React + TS)
│  ├─ OverlayApp.tsx          # Main overlay shell (header, launcher, routing)
│  ├─ components/
│  │  ├─ A11yMenu.tsx         # Material Symbols icon + accessibility toggles
│  │  ├─ DrawCanvas.tsx       # Canvas, tools, shapes, gallery, save
│  │  ├─ QuestionsFlow.tsx    # Plan/questions, loading sequence, finalization
│  │  ├─ TutorialFlow.tsx     # In‑app tutorial, step logic
│  │  ├─ TutorialOverlay.tsx  # Typing bubble + avatar sidebar
│  │  ├─ AnimCycle.tsx        # PNG sprite animation (Anim1/2/3)
│  │  └─ (other UI cards)
│  └─ index.tsx               # Overlay entry
├─ popup/                     # Minimal launcher popup
│  ├─ App.tsx                 # Redirects to lovable.dev if needed
│  └─ index.tsx
├─ styles.css                 # Global + utility CSS (Fredoka, Material Symbols)
└─ …
```

## Installation

1. Install dependencies
```bash
npm install
```
2. Build the extension
```bash
npm run build
```
3. Load in Chrome:
   - Go to `chrome://extensions` → enable Developer mode
   - Load unpacked → select the `dist/` folder

## Usage

1. Click the LovaBuddy toolbar icon (custom icon via `manifest.json`).
2. In the popup, click the launcher button:
   - On Lovable: “Open overlay on page” toggles the overlay.
   - Not on Lovable: the button turns yellow (“Must be on Lovable.dev. Press to open.”) and opens `https://lovable.dev` in a new tab.
3. In the overlay:
   - Use the header (centered brand, controls on the right) and the bottom‑left accessibility button.
   - Choose Describe (type + Submit or press Enter) or open the Draw section.
   - Save drawings; manage them from the gallery; click a thumbnail to load.
   - Follow the tutorial steps as needed.

## Accessibility

- Large text, high contrast, and bold text toggles via the Material Symbols accessibility button.
- Reduced motion styling hooks exist; most animations are minimal and gentle.
- The UI uses Fredoka and large, rounded controls.

## Icons & Branding

- Manifest uses `icons/icon16/32/48/128.png` for crisp toolbar/management icons.
- Header shows a slightly larger brand icon and lighter blue “LovaBuddy” title with widened tracking.

## Tech stack

- React 18 + TypeScript
- Tailwind‑style classes in plain CSS
- Webpack (Manifest V3)
- Chrome extension APIs (`chrome.storage`, `chrome.tabs`, `chrome.scripting`)

## Configuration notes

- Loading messages for planning and final build phases rotate every ~4 seconds and type out with a small delay for a friendly feel.
- Keyboard undo/redo shortcuts are intentionally removed; use the toolbar buttons instead.
- Gallery thumbnails support hover‑to‑delete and click‑to‑open.

## Development scripts

- Build: `npm run build`
- Dev (watch): `npm run dev`
- Clean: `npm run clean`

## Privacy & data

- Drawings are stored locally via `chrome.storage.local`.
- No analytics or tracking are included by default.

## Troubleshooting

- If the accessibility icon shows as text, Chrome may need to fetch the Material Symbols font. Reload the tab or extension.
- If the overlay doesn’t appear, the content script may not be injected on the current page; use the launcher popup to open Lovable first.

## License

MIT — see LICENSE.
