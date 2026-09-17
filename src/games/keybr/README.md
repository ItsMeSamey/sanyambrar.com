# Keybr

A local-only, frontend-only typing trainer derived from [keybr.com](https://www.keybr.com/).

The app uses SolidJS and Vite, with adaptive lessons, keyboard layouts, local statistics, story books, and local persistence. It has no server-side account, multiplayer, payment, sync, or persistence layer.

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

Core modules, UI, and the application entry point all live under `src/`.

## Build

The portfolio root owns dependencies and publication:

```sh
bun build.ts keybr
```

Vite builds `src/games/keybr/index.html` through the Keybr target in the root `vite.config.ts`. `build.ts` publishes the small HTML shell and the split runtime/data assets as:

```text
docs/keybr.html
docs/keybr-assets/
```

Application code is chunked. Each book, language word list, and phonetic model is emitted as its own asset and fetched only when the selected lesson needs it.

For local Keybr development from the repository root:

```sh
bun run dev:keybr
```

No separate Keybr dependency installation is required.

## Book corpus

The catalog contains 100 English books plus the existing French, German, and Spanish editions. The 97 added English works are pinned to Project Gutenberg ebook IDs in `src/content/books/catalog.ts`; the importer strips Gutenberg wrappers and rejects suspiciously truncated results.

```sh
bun run import:keybr-books
bun run check:keybr-corpus
```

## Local data

Settings stay in `localStorage`. Typing results stay in IndexedDB. Neither is sent to a server. Clearing site data removes both.

## Origin and license

Derived from `aradzie/keybr.com` by Aliaksandr Radzivanovich and contributors. The original project and this derivative are distributed under GNU AGPL v3; see `LICENSE`.
