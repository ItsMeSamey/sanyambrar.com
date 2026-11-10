# Sanyam Brar

My personal site, plus a pile of small games and tools. It ships as static files, but navigation still feels like one app.

**[Live site](https://sanyambrar.com/)** · [Work](https://sanyambrar.com/work/) · [Writing](https://sanyambrar.com/blog/) · [Tools](https://sanyambrar.com/tools/)

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

The site, Wordle and Keybr share Solid 2 RC and the same Vite compiler. `solid-js` and `@solidjs/web` are pinned to `2.0.0-rc.13`; `@kobalte/core` uses `2.0.0-alpha.2`, with package overrides keeping Solid core, web, and signals on the same RC. Larger editors and demos load only when opened.

Diff uses one editable Monaco DiffEditor. Monaco owns line alignment, gap zones, and character-level highlighting. It is used without dependency patches.

## Chain Reaction opponents

Chain Reaction uses the accepted CRT epoch 134 model with four-candidate Gumbel search. The opponent evaluates the exact outcome of candidate moves and estimates its chance of winning against every remaining player. All supported board sizes and one to five opponents use the same trained model.

Inference runs in a dedicated browser worker, using WebGPU when available and single-threaded WebAssembly otherwise. The 13.8 MB FP32 model and matching ONNX Runtime 1.30 assets are self-hosted and load on the first opponent turn. They are excluded from service-worker installation downloads and cached when used. There is no inference server or random-move fallback.

Pending decisions stop when a game is reset, left, hidden, or unmounted. A failed download or inference shows the full error and a retry button while retaining the saved position. Unfinished older games upgrade their opponents at the next session, recording the move where the change happened. Completed history keeps its original opponent identity; a replay fork upgrades only the new match.

The model's accepted checkpoint is unchanged. [Export instructions and identity](scripts/chain-model/README.md) describe how to reproduce the ONNX file and its numerical parity checks. `bun run test:chain` checks rules, feature encoding, and search against Python fixtures. `tests/chain-bot.spec.mjs` checks actual browser inference, game turns, cancellation, retries, and saved-game migration.

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

Type checking explicitly runs TypeScript 7 through the `typescript-7` package alias. The `typescript` dependency stays on 6.0 for typescript-eslint's compiler API; calling the aliased compiler directly avoids depending on which package owns the shared `tsc` executable.

Dependency overrides pin the patched DOMPurify and brace-expansion releases. `bun audit` still reports [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in `braces`, which has no patched release as of 2026-10-03. It is pulled in by the build-only single-file plugin; our empty `inlinePattern` configuration bypasses its pattern matcher.


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
