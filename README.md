# Sanyam Brar

My personal site, plus a pile of small games and tools. It ships as static files, but navigation still feels like one app.

**[Live site](https://itsmesamey.github.io/)** · [Work](https://itsmesamey.github.io/work/) · [Writing](https://itsmesamey.github.io/blog/) · [Tools](https://itsmesamey.github.io/tools/)

## What's here

| | |
|---|---|
| **Games** | Wordle, Keybr, Chain Reaction |
| **Tools** | Live diff, Markdown preview, text inspector, encoders, converters |
| **Work** | Projects and open-source work |
| **Writing** | Notes and longer technical posts |

## Shape of the site

```text
src/ + site.ts
      │
      ▼
   build.ts ──► docs/ ──► GitHub Pages
      │
      ├── Site / Work / Writing / Projects
      ├── Tools + Monaco workers
      ├── Wordle
      ├── Keybr
      └── Chain Reaction
```

Most pages share the same shell for navigation, themes, search, transitions, context menus, and the custom cursor. Same-origin navigation swaps real page roots instead of using iframes.

Wordle is Solid/Vite. Keybr keeps its React/Webpack app. The rest of the site is Solid, with larger pieces loaded only when they are opened.

Diff uses two editable Monaco panes. A worker keeps incremental line state and computes bounded diffs, keeping that work off the main thread.

## Build

```sh
bun install
bun run build
```

`docs/` is the deployable site.

Monaco has a small version-pinned patch under [`patches/`](./patches/). It is applied with `patch-package` during install, not by keeping edited `node_modules` files around.

## Repository map

```text
src/site/       home, work, project pages
src/shared/     browser shell, navigation, themes, shared UI
src/tools/      tools, Monaco editors, diff worker
src/games/      Wordle, Keybr, Chain Reaction
src/blogs/      writing source
src/static/     static page sources
patches/        dependency patches
docs/           generated site served by GitHub Pages
```
