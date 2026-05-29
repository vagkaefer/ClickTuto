# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2025-05-29

### Fixed
- Arrow resize via draggable endpoint handles now persists correctly after re-render
- Text annotation resize via Transformer scales fontSize instead of node scale
- Blur annotation selectable and resizable (fixed Konva.Image hit region and instanceof check)
- Recording overlay hidden during screenshot capture (no longer appears in saved steps)
- "Parar & Editar" button correctly opens editor after stopping recording
- Click now non-blocking — site interactions work normally during recording
- Auto-switch to select tool after drawing any annotation

### Changed
- Extension renamed to ClickTuto
- Icons updated to use official SVG asset

## [0.9.0] - 2025-05-29

### Added
- Recording overlay with click capture and step counter
- Gaussian blur annotation (real CSS filter, not color overlay)
- Arrow annotations with draggable endpoint handles
- Circle, highlight, and text annotations
- Drag-to-move and resize for all annotation types (Transformer for rects/circles, custom handles for arrows)
- Auto-switch to select tool after drawing an annotation
- Tutorial list view with thumbnail strip and storage size estimate
- Delete tutorial with confirmation (frees all screenshot data)
- Export as Markdown ZIP (images as separate files), self-contained HTML, and PDF
- Toggle to include/exclude step URLs in exports
- Recording options: element highlight border, click ripple dot
- Popup shows up to 5 recent tutorials with "Ver todos" link
- Back navigation from editor to tutorial list
- Screenshot captured after click (120ms delay) so site UI responds first
- Overlay hidden during screenshot capture to avoid appearing in output
- Firefox build target (`npm run build:firefox`)
- Unit tests with Vitest
- CI with GitHub Actions (type-check, build, test)

## [0.1.0] - 2025-05-29

### Added
- Initial scaffold: Manifest V3, Vite + React + TypeScript
- Four entry points: popup, editor, background service worker, content script
- `chrome.storage.local` wrapper with full tutorial CRUD
- Basic click capture and screenshot via `captureVisibleTab`
