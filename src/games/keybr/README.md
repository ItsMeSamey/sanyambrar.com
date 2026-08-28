# keybr local

A local-only, frontend-only typing trainer derived from [keybr.com](https://www.keybr.com/).

The portfolio build keeps the useful adaptive engine, layouts, lesson generators, local statistics, and persistence, but replaces the original application shell with a small SolidJS frontend built by Vite. React, React DOM, React Intl, Webpack, Less, server rendering, accounts, multiplayer, payments, remote sync, and backend persistence are not part of this app.

## Architecture

```text
Browser
  ├─ SolidJS UI
  │   ├─ Practice
  │   ├─ Statistics
  │   └─ Settings
  ├─ keybr core modules
  │   ├─ adaptive lessons
  │   ├─ keyboard layouts
  │   ├─ phonetic models / word lists
  │   └─ result statistics
  ├─ localStorage
  │   └─ settings
  └─ IndexedDB
      └─ typing history
```

The retained `packages/` directories are framework-free core modules. The Solid app lives in `src/`.

## Build

The portfolio root owns dependencies and publication:

```sh
bun build.ts keybr
```

Vite builds `src/games/keybr/index.html` through `src/games/keybr/vite.config.ts`, inlines JavaScript, CSS, compressed phonetic models, and word/book data into one staged HTML file, and `build.ts` publishes it as:

```text
docs/keybr.html
```

For local Keybr development from the repository root:

```sh
bun --cwd src/games/keybr run dev
```

No separate Keybr dependency installation is required.

## Local data

Settings stay in `localStorage`. Typing results stay in IndexedDB. Neither is sent to a server. Clearing site data removes both.

## Origin and license

Derived from `aradzie/keybr.com` by Aliaksandr Radzivanovich and contributors. The original project and this derivative are distributed under GNU AGPL v3; see `LICENSE`.
