# Dev Showtime Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove OBS integration and provide the approved theatrical redesign only through an unlisted development URL.

**Architecture:** The existing engine and DOM remain the source of gameplay. A strict `?dev=showtime` switch loads a separate presentation module and stylesheet; all development persistence uses a separate storage namespace. The normal route retains its current theme.

**Tech Stack:** Existing JavaScript modules, SVG, Canvas, CSS, Vite, node:test; generated WebP scene and transparent pig sprite sheet.

**Spec:** User-approved visual concept and 2026-10-08 instruction in this conversation; unlisted access selected explicitly, without password protection.

## Global Constraints
- Preserve all wheel fields, odds, normal and Hardcore rules.
- Do not activate the new theme on the default route.
- Remove OBS controls, URL behavior and documentation.
- Do not let preview play overwrite normal settings, archives, audio state or leaderboard.
- Respect reduced motion and retain keyboard, archive and settings flows.

## Review Focus
- Default and legacy OBS URLs must show the normal theme without transparency.
- Similar or malformed dev parameters must not accidentally activate the preview.
- Dev storage errors must remain recoverable without falling back to normal data.
- Results, restart and mode changes must clear temporary presentation effects.
- Mobile and short desktop viewports must retain visible primary controls.

## Task 1: Dev routing, storage and OBS removal
**Files:** `src/dev/PreviewMode.js`, `src/main.js`, `src/ui/StudioPanel.js`, `index.html`, `src/styles/casino.css`, `README.md`, `tests/PreviewMode.test.js`.
- [ ] Write and run failing behavior tests for exact preview activation and storage isolation, including SessionManager reloads.
- [ ] Implement `isDevPreview(search: string): boolean` and `previewStorage(storage): StorageLike|null`.
- [ ] Remove OBS controls and logic. Strip obsolete OBS styling and docs.
- [ ] Run the existing suite plus the new tests.

## Task 2: Showtime presentation
**Files:** `src/dev/Showtime.js`, `src/dev/showtime.css`, `public/dev/stage.webp`, `public/dev/pig-sprites.webp`, `src/main.js`.
- [ ] Mount scene, player strip, brass medallion and pig sprites only in dev mode; use plain text for player-controlled content.
- [ ] Scope every style to the dev root. Tie expressions, illumination, result cards and record feedback to committed game state.
- [ ] Preserve canonical SVG segment geometry; use decorative bevels and textures without changing hit selection.
- [ ] Verify normal, dev, Hardcore, reload, manual ending, reduced motion, mobile and laptop layouts in a real browser.

## Task 3: Review and publish
- [ ] Run `npm run build` and inspect the full output.
- [ ] Obtain an independent code review and address material findings.
- [ ] Publish reviewed changes to GitHub, retaining the dev gate.
- [ ] Verify GitHub Pages normal and dev URLs; provide the dev link and an actual screenshot.
