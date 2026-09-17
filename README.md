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
src/
      │
      ▼
   build.ts ──► docs/ ──► GitHub Pages
      │
      ├── Site / Work / Writing / Projects
      ├── Tools + Monaco DiffEditor
      ├── Wordle
      ├── Keybr
      └── Chain Reaction
```

Most pages share the same shell for navigation, themes, search, transitions, context menus, and the custom cursor. Same-origin navigation swaps real page roots instead of using iframes.

The site, Wordle and Keybr share Solid 2 RC and the same Vite compiler. `solid-js` and `@solidjs/web` are pinned to `2.0.0-rc.6`; `@kobalte/core` remains on `2.0.0-alpha.1`, with package overrides keeping Solid core, web, and signals on the same RC. Larger editors and demos load only when opened.

Diff uses one editable Monaco DiffEditor. Monaco owns line alignment, gap zones, and character-level highlighting. It is used without dependency patches.

## Build

```sh
bun install --ignore-scripts --frozen-lockfile
bun run build
```

`docs/` is the deployable site.

Monaco is used as a normal pinned dependency; the repository does not patch or modify `node_modules` during install.

## Development and validation

Build once for the generated site assets, then use `bun run dev` for the site, `bun run dev:wordle`, or `bun run dev:keybr`. These serve on localhost ports 4320, 4321 and 4322 and use the production Vite compiler.

`bun run check` runs type checking, typed linting, the build, and Playwright tests. Tests use Chromium; an installed `/usr/bin/brave` is detected automatically, or set `BROWSER_EXECUTABLE` to your browser. Otherwise install Playwright's Chromium with `bunx playwright install chromium`.


## Repository map

```text
src/site/       home, work, project pages
src/shared/     browser shell, navigation, themes, shared UI
src/tools/      tools, Monaco editors and DiffEditor
src/games/      Wordle, Keybr, Chain Reaction
src/blogs/      writing source
src/site/public/  site-root files copied into the generated deployment
docs/           generated site served by GitHub Pages
```
