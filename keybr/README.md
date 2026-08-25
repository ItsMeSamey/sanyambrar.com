# keybr local

A local-only, frontend-only fork of [keybr.com](https://www.keybr.com/).

This fork keeps the adaptive typing trainer, keyboard layouts, lesson modes, local statistics, and settings. It removes the hosted-service parts: accounts, authentication, public profiles, remote sync, high scores, multiplayer, checkout, server rendering, the Node HTTP/WebSocket backend, and the SQL/user-data persistence layers.

## What remains

- Adaptive guided lessons and per-key learning statistics.
- Word, book, custom text, number, and code lesson support.
- Keyboard layouts and typing languages from the original project.
- Practice settings and local statistics/charts.
- Settings stored in `localStorage`.
- Typing history stored in IndexedDB (`history`).
- Light, dark, high-contrast variants, and a persistent custom color theme; no bundled web fonts or decorative theme assets.

No typing history or settings are sent to a server by this application.

## Requirements

Install [Bun](https://bun.sh/) 1.2.20 or newer.

```sh
bun install
```

There is no npm workflow or `package-lock.json` in this fork.

## Build

```sh
bun run build
```

The production build intentionally emits exactly one file:

```text
dist/index.html
```

JavaScript, CSS, phonetic-model data, sounds, and other runtime assets are inlined into that HTML file. Webpack is configured to fail the build if another emitted asset survives the final bundling step.

For an unminified/watch build:

```sh
bun run dev
```

## Run locally

Build with `bun run build`, then open or host `dist/index.html` with any static-file server. The repository contains no application server.

## Data model

There is intentionally no user identity. One browser profile is one local typing profile.

```text
Browser
  ├─ React SPA
  │   ├─ Practice
  │   └─ Statistics
  ├─ localStorage
  │   └─ settings
  └─ IndexedDB
      └─ typing history
```

Clearing site data deletes the local history/settings. There is no cloud recovery or cross-device synchronization.

## Validation note

The refactor is designed for Bun and a browser-only Webpack target. The source tree can be statically validated without the removed backend. If you change build dependencies, run `bun install` followed by `bun run build`; the single-file plugin will reject accidental extra output files.

## Origin and license

Derived from `aradzie/keybr.com` by Aliaksandr Radzivanovich and contributors. The original project and this derivative are distributed under the GNU Affero General Public License v3.0; see `LICENSE`.
