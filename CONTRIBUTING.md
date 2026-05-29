# Contributing to Click-Tuto

Thanks for your interest! Here's everything you need to get started.

## Development setup

```bash
git clone https://github.com/vagkaefer/ClickTuto.git
cd ClickTuto
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension in `brave://extensions` (Developer mode on).

For watch mode:

```bash
npm run dev
```

After Vite rebuilds, click the **↺** icon on the extension card to reload it.

## Before submitting a PR

```bash
npm run type-check   # no TypeScript errors
npm run lint         # no ESLint errors
npm test             # all tests pass
npm run build        # clean production build
```

## Project structure

See [README.md](README.md#project-structure) for the full breakdown.

## Key architectural decisions

**Why no React state for Konva?**  
Konva manages its own render tree. React state drives which step is shown and triggers a full stage rebuild, but individual annotation mutations (drag, resize) are handled imperatively inside `bindEvents` and persisted via refs to avoid stale closures.

**Why `chrome.storage.local` for screenshots?**  
Screenshots are base64 PNGs stored inline inside the `Tutorial` object. There's no separate blob storage — deleting a tutorial frees everything at once. This trades storage efficiency for simplicity.

**Why MV3 service worker instead of background page?**  
Chrome is deprecating MV2. The service worker lifecycle means state must be persisted to `chrome.storage` between events — `RecordingState` is the source of truth, never in-memory.

**Firefox compatibility**  
`npm run build:firefox` produces `dist-firefox/`. The only difference is the manifest `background` field (`scripts` instead of `service_worker`). The `__BROWSER__` define can be used for any runtime conditional.

## Adding a new annotation type

1. Add the type interface to `src/shared/types.ts` and include it in the `Annotation` union
2. Handle it in `buildNode()` in `ImageCanvas.tsx` (render)
3. Handle it in `bindEvents → mousedown` (draw)
4. Handle it in `dragend` and `transformend` (persist)
5. Handle it in `renderStepImage()` in `ExportPanel.tsx` (export)
6. Add a toolbar button in the `toolDefs` array in `ImageCanvas.tsx`

## Bug reports

Please open an issue with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors if any

## Code style

- TypeScript strict mode — no `any`
- No comments explaining *what* code does — only *why* when non-obvious
- Functional React components, no class components
- Inline styles (consistent with existing code) — no CSS modules or Tailwind
