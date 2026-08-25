# ItsMeSamey.github.io

Single repository for the static site and both source-built apps:

- `keybr/` builds `keybr.html`
- `wordle/` builds `wordle.html`
- `blog/` contains the static blog
- `shared/appearance.json` is the source of truth for site fonts and base theme palettes
- `theme.js` and `site.css` own shared runtime/chrome behavior

Run:

```sh
./build.sh
```

If dependencies are absent or do not match their lockfile, the build uses Bun with `--frozen-lockfile` before compiling. Both app lockfiles are checked in.

The build then:

1. generates runtime and Keybr palette data from `shared/appearance.json`;
2. typechecks Wordle, then builds Keybr and Wordle into deterministic single-file HTML outputs;
3. generates the service worker from the actual deploy tree;
4. generates deterministic `.html.gz` and `.html.br` siblings;
5. verifies build artifacts, compression, shared site contracts, architecture boundaries, and every Keybr theme variable.

Shared appearance persistence, validation, custom-theme derivation, navigation controls, custom cursors, virtual scrollbars, context menus, SPA navigation, and service-worker registration live in one runtime. Keybr only subscribes to that runtime through `SameyAppearance`; it does not persist or derive a second copy of the site appearance state.
