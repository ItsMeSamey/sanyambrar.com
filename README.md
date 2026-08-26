# Sanyam Brar

The root Solid workspace now owns both Wordle and Tools. They share Solid, Tailwind, the UI kit, the appearance runtime, TypeScript, Vite and one dependency graph. Keybr remains isolated because it is a separate React/Webpack workspace. Hand-written pages and shared browser assets live under `static/`; GitHub Pages publishes `docs/`.

```text
src/          Solid apps + shared UI kit
src/tools/    integrated browser tools
static/       home/work/blog + shared site runtime/appearance
keybr/        isolated Keybr workspace
build.ts      generation, builds, compression, verification
docs/         generated GitHub Pages tree
```

Build everything with `bun build.ts`, or select `solid`, `tools`, `keybr`, and/or `static`. A full build generates shared appearance data, audits source invariants, builds the apps, generates the service worker, writes `.html.gz` and `.html.br` sidecars, and verifies decompression byte-for-byte.

If dependencies are absent or stale, `build.ts` uses Bun with the frozen root or Keybr lockfile. Tools deliberately have no second package, lockfile, Vite config, Monaco runtime, or duplicated component library.
