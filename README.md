# Sanyam Brar

A static portfolio that behaves like one application.

## Architecture

`site.ts` is the content and page-generation source of truth for Home, Work, Lab, project pages, navigation metadata, and the static search index. `build.ts` builds into temporary state and publishes transactionally into `docs/`, including gzip/Brotli sidecars and source/runtime audits.

The shared browser shell lives in `src/shared/runtime.ts`, `src/shared/theme.ts`, `src/shared/site.ts`, and `src/shared/styles/site.css`. It owns appearance, custom cursors, loading state, virtual scrollbars, context menus, search, internal navigation, prefetching, and View Transition page swaps. Internal pages, including `/tools`, are fetched lazily and swapped without unloading the shell. Heavy game applications (`/wordle`, `/chain`, `/keybr`) are also lazy-loaded into an isolated same-origin app frame, so navigating to a game does not unload the top-level site document.

`src/ui-kit/` contains the reusable Solid controls used by Wordle. Tools use the shared site runtime directly: the normal site header is the only toolbar, tool selection lives inside that header, and tool-specific status/actions reuse the same row instead of creating nested or floating toolbars. Text-heavy tools use lazily loaded Monaco editors with the shared appearance palette; Diff uses Monaco Diff Editor and Markdown uses Monaco plus source-aware linked preview scrolling. `src/shared/styles/game-settings.css` is the shared game-settings contract used by Wordle and Chain Reaction. Controls intentionally share geometry, focus behavior, pressed states, surfaces, motion timings, and theme tokens rather than maintaining app-specific visual systems.

## Site map

```text
Home
  Games
  Tools
  Writing

Work
  Projects
  Open-source contributions

Lab
  Small interactive experiments

Projects
  Focused detail pages
```

`⌘ K` on macOS and `Ctrl K` on Windows/Linux opens the site search/command palette. Same-origin links are prefetched on intent and navigated through the shared shell. Tool URLs contain only the selected tool; editor contents and tool settings stay in per-tool local storage rather than being serialized into URLs.

## Build

```sh
bun build.ts
```

GitHub Pages publishes `docs/`. Wordle is the Vite/Solid build, Keybr remains its own React/Webpack application, Tools are a lightweight shared-runtime page, and Chain Reaction remains a deliberately small canvas application. Generated HTML is accompanied by byte-equivalent `.gz` and `.br` files.
