# ItsMeSamey.github.io

Solid is the root application. Keybr remains isolated because it has its own React/Webpack workspace. Hand-written pages and shared browser assets live under `static/`. `dist/` is the clean staging/verification tree; a full build then replaces `docs/` with that verified tree so GitHub Pages can publish from `/docs`. Inside Pages, `docs/` is the site root.

```text
src/        Solid app
static/     home, blog, shared theme/runtime, appearance source
keybr/      Keybr source workspace
build.ts    generation + parallel builds + compression + verification
dist/       generated staging/verification tree (ignored)
docs/       generated GitHub Pages tree (commit this)
```

Build everything:

```sh
node --experimental-strip-types ./build.ts
```

Build only selected source targets:

```sh
node --experimental-strip-types ./build.ts solid
node --experimental-strip-types ./build.ts keybr
node --experimental-strip-types ./build.ts solid keybr
node --experimental-strip-types ./build.ts static
```

A full build generates the shared appearance artifacts, audits source invariants, builds Solid and Keybr concurrently, assembles the static deploy tree, generates the service worker, writes `.html.gz` and `.html.br` beside every HTML page, verifies those sidecars byte-for-byte, then replaces `docs/` with the verified `dist/` tree. After `bun build.ts`, `docs/index.html` is the GitHub Pages entry point and every HTML page under `docs/` has matching gzip and Brotli files beside it. Configure GitHub Pages to deploy from the `docs/` folder on the publishing branch.

If a selected app's dependencies are absent or stale, `build.ts` runs `bun install --frozen-lockfile` for that app. Root `bun.lock` and `keybr/bun.lock` are source files and are not ignored.
