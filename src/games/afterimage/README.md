# Afterimage

Solid 2 application at `/afterimage/`, built with the portfolio's Vite configuration. It uses the shared theme, top bar, buttons, dialogs and icons. Game families load on demand; their assets are also included in the site's offline cache. The install manifest is scoped to `/afterimage/`; the existing site service worker owns caching.

```sh
bun run dev:afterimage
bun run build:afterimage
bun run test:afterimage
bun run check:afterimage-build
```

The full site build includes Afterimage and emits `docs/afterimage/`. Run type checking, typed lint, the Afterimage protocol tests and browser interaction checks after gameplay changes. Protocol tests live under `tests/afterimage-*.test.ts`; word-game checks are in `words.test.mjs`.

Game state uses synchronous controllers for press timing and immutable Solid snapshots for rendering. Solid 2 signal writes are staged: calculate the next state before scheduling timers or updating imperative APIs. Dispose timers and input listeners on navigation, and cancel unfinished runs when interrupted. Preserve scope names when rules remain equivalent; changed measurement rules need a new scope.

The original application remains in `~/js/memory-grid`. Existing `afterimage-history-*` and `afterimage-best-*` keys remain readable, including older rules. History export/import merges records without replacing existing runs. Browser storage is isolated by origin: installing this app at a new address does not transfer scores from the old Pages address. The old application currently has no export UI; those scores remain at their original address until an export is made there.
