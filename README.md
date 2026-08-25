# ItsMeSamey.github.io

Static site with two source-built single-file apps:

- `keybr/` -> `keybr.html`
- `wordle/` -> `wordle.html`

Run:

```sh
./build.sh
```

The build rebuilds both game submodules, copies their single-file outputs to the site root, generates deterministic `.html.gz` and `.html.br` siblings for every deployed HTML page, then verifies that each compressed file decompresses byte-for-byte to its source page.

Shared site behavior lives in `theme.js` and `site.css`: theme/font state, navigation controls, custom cursors, virtual scrollbars, context menus, and SPA navigation for the Home/Blog pages. Keeping that chrome centralized avoids per-page styling drift.

The archive includes the dependency trees used for the build. Wordle's small UI compatibility layer lives in `wordle/src/ui-kit/`, so its build does not require the historical nested `solid-ui` git submodule.
