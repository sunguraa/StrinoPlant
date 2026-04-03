# StrinoPlant

StrinoPlant is a map-based strategy planner for Strinova players who want to sketch executes, save setups, and share ideas without signing in or standing up backend infrastructure.

It is built for ranked players, scrim groups, shotcallers, coaches, and anyone who wants a fast way to turn an idea into a visual plan. Open a map, drag agents and utility onto the board, draw the route, and keep everything local in the browser unless you choose to export or share a collaboration link.

## What It Does

- Create named setups for ranked Strinova maps.
- Draw arrows, lines, shapes, text, and freehand callouts on top of cached map images.
- Drag agent portraits, ability icons, and utility markers onto the canvas.
- Save everything locally in browser storage with no account system.
- Export setups as images or JSON backups.
- Collaborate live through shareable peer-to-peer links.

## Why This Exists

Most tactical planning tools for hero shooters either assume a full backend, focus on a different game, or feel too heavy for quick prep. StrinoPlant aims to stay lightweight: local-first, easy to open, and practical for everyday planning.

## Current Status

StrinoPlant is already usable for planning and sharing setups. The current app includes map-first navigation, browser-local persistence, utility and agent placement, image export, curated presets, and live collaborative editing.

## Local Development

### Requirements

- Node.js 20+
- npm

### Start The App

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

### Common Commands

```bash
npm run lint
npm run build
npm run format:check
npm run refresh-wiki-cache
```

Setups are stored in browser localStorage during development. Wiki-derived assets used by the app are committed to the repository so the UI can run without runtime wiki requests.

## Contributing

Issues and pull requests are welcome.

If you want to contribute, the most useful areas are:

- Canvas usability and editor polish
- New preset content and map setup examples
- Accessibility and keyboard support
- Tests for canvas state, storage flows, and editor interactions
- UI cleanup and responsive behavior

For code changes:

1. Install dependencies with `npm ci`.
2. Run the app with `npm run dev`.
3. Run `npm run lint` before opening a pull request.
4. Include clear reproduction steps for bug fixes or a short note on the user-facing change.

## Community Presets

Community presets are planned to be a bigger part of the project. If you have a setup or preset you want added or featured, send a message to `sunguraa` on Discord.

## Credits

- Strinova Wiki for map images, agent assets, and reference data.
- ValoPlant for proving how useful a dedicated tactical planner can be.
- Built with Next.js, React, TypeScript, Tailwind CSS, Konva, Yjs, Trystero, Node.js, and shadcn/ui.

## Project Notes

- The app is local-first and does not require accounts.
- Ranked and demolition maps are the current focus.
- Collaboration is link-based and peer-to-peer.

## Project Scope

This repository is public and under active development. Expect regular iteration as the planner, preset library, and collaboration workflow continue to improve.
