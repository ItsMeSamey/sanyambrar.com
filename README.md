# Sanyam Brar

One static portfolio, with two application workspaces only where the technology boundary is real.

```text
site.ts             Home / Work / Lab / project-page generator + search index
src/shared/         data shared by generated pages and Solid apps
src/tools/          integrated Solid tools
src/ui-kit/         UI primitives shared by Wordle and Tools
src/game/           Wordle
static/             hand-written shared runtime, CSS, Chain Reaction and blog
keybr/              isolated React/Webpack application
docs/               generated GitHub Pages tree
build.ts            transactional build, audits, compression and verification
```

Home contains Games, Tools and Writing. Work contains projects and open-source contributions. Lab contains small interactive technical experiments. `Ctrl/Cmd+K` searches across all of them.

Tools are part of the root Solid workspace. They share Solid, Tailwind, the UI kit, appearance runtime, TypeScript, Vite and one dependency graph with Wordle. Tool state is local-first and URL-addressable; switching tools does not leak query state between tools, and text can be passed directly between compatible tools with **Send to…**.

Keybr remains isolated because it is a distinct React/Webpack workspace. There is no second Tools package, lockfile, Vite config, Monaco runtime, or duplicate component library.

Run `bun build.ts` for the complete build, or select `solid`, `tools`, `keybr`, and/or `static`. A full build:

1. generates appearance data and the static site into temporary build state,
2. audits source/runtime contracts,
3. transactionally replaces `docs/`,
4. builds Wordle, Tools and Keybr,
5. generates the service worker,
6. writes gzip/Brotli HTML sidecars,
7. verifies every sidecar by decompression and byte equality,
8. restores the previous `docs/` tree if anything fails.
