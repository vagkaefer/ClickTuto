# Click-Tuto

> Browser extension to create step-by-step tutorials by clicking — screenshot, annotate, export.

Click-Tuto records your clicks, captures screenshots, and lets you annotate each step with arrows, highlights, blur regions and text labels. Export your tutorial as Markdown (ZIP), self-contained HTML, or PDF.

## Features

- **Click recording** — click anywhere on a page, screenshot is captured automatically
- **Visual annotations** — arrows, circles, highlights, gaussian blur, text labels
- **Drag & resize** — all annotations are movable and resizable after creation
- **Step management** — reorder steps via drag-and-drop, edit title and description per step
- **Export** — Markdown + images (ZIP), self-contained HTML, PDF with proper aspect ratios
- **Recording options** — toggle element highlight border and click ripple dot
- **Brave / Chrome** — Manifest V3; Firefox support via `npm run build:firefox`

## Installation (development)

### Prerequisites

- Node.js 18+
- Brave or Chrome browser

### Setup

```bash
git clone https://github.com/vagkaefer/ClickTuto.git
cd click-tuto
npm install
npm run build
```

### Load in browser

1. Open `brave://extensions` (or `chrome://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Development (watch mode)

```bash
npm run dev
```

After each rebuild, go to `brave://extensions` and click the **↺ reload** icon on the Click-Tuto card.

## Usage

1. Click the Click-Tuto icon in the toolbar
2. Click **Iniciar Gravação**
3. Navigate and click elements on any page — each click saves a step
4. Click **Parar & Editar** (overlay button or popup) to open the editor
5. Edit titles, descriptions, and annotate each screenshot
6. Export via the panel in the bottom-left of the editor

## Project structure

```
src/
├── background/
│   └── service-worker.ts     # MV3 service worker — coordinates capture, storage, messaging
├── content/
│   └── overlay.ts            # Injected into pages — click listener, recording HUD
├── editor/
│   ├── Editor.tsx             # Route: list view (no ?tutorial=) or editor (?tutorial=ID)
│   ├── TutorialList.tsx       # Tutorial grid with delete confirmation
│   ├── ImageCanvas.tsx        # Konva-based annotation canvas
│   ├── StepList.tsx           # Draggable step sidebar
│   ├── StepForm.tsx           # Per-step title/description fields
│   └── ExportPanel.tsx        # MD / HTML / PDF export with options
├── popup/
│   └── Popup.tsx              # Extension popup — start/stop recording, options, recent list
└── shared/
    ├── types.ts               # All shared TypeScript types
    └── storage.ts             # chrome.storage.local wrapper
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Watch mode — rebuilds on file change |
| `npm run build` | Production build → `dist/` |
| `npm run build:firefox` | Firefox build → `dist-firefox/` |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run lint` | ESLint |

## Tech stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Canvas / annotations | Konva.js |
| Drag-and-drop | @hello-pangea/dnd |
| PDF export | jsPDF |
| ZIP export | JSZip |
| Tests | Vitest |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Vagner Kaefer
