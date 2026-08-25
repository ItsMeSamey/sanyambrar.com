# ItsMeSamey.github.io

Solid is the root application. Keybr remains isolated because it has its own React/Webpack workspace. Hand-written pages and shared browser assets live under `static/`; deploy output is generated under `dist/`.

```text
src/        Solid app
static/     home, blog, shared theme/runtime, appearance source
keybr/      Keybr source workspace
build.ts    generation + parallel builds + compression + verification
dist/       generated deploy tree (ignored)
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

A full build generates the shared appearance artifacts, audits source invariants, builds Solid and Keybr concurrently, assembles the static deploy tree, generates the service worker, compresses HTML in parallel, and verifies the resulting site.

If a selected app's dependencies are absent or stale, `build.ts` runs `bun install --frozen-lockfile` for that app. Root `bun.lock` and `keybr/bun.lock` are source files and are not ignored.
