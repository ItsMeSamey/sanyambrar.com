# Solid 2 migration

The site, Wordle and vendored Keybr port use `solid-js` and `@solidjs/web` **2.0.0-rc.6**, with `@solidjs/vite-plugin` **3.0.0-next.39**. Direct framework/compiler versions are pinned in `package.json`; package-manager lockfiles are intentionally untracked. No dependency files are patched.

## Upstream compatibility

| Dependency | Verified finding | Resolution |
| --- | --- | --- |
| `vite-plugin-solid` | Solid 1 compiler integration | Replaced by the official Solid 2 Vite plugin. |
| `lucide-solid` | Published peer range and imports still target Solid 1 | Uses `lucide` 1.41.0 geometry with a native Solid 2 SVG renderer instead. |
| Kobalte stable | Targets Solid 1 | Uses experimental `@kobalte/core` 2.0.0-alpha.1. |
| Kobalte alpha peers | Core declares exact RC.3 peers; its utils dependency declares RC.0 peers | Explicit overrides unify core, web and signals on RC.6. Passing local tests is not upstream-declared RC.6 support. |
| Kobalte alpha Slider | An isolated controlled slider remains at 6 after ArrowRight; a direct setter changes it to 7 | Wordle uses themed native range inputs. The unused slider wrapper is removed. |
| Kobalte alpha Tooltip | Hover safe-area code reads an undefined placement and can throw; the popup also appeared at the viewport origin | Share uses its button's native title. The unused tooltip wrapper is removed. |
| Kobalte alpha Escape shortcut | Escape did not dismiss the nested Share dialog in the browser reproduction | Dialog and popover wrappers close through the public context from their local keyboard handler, preserving cancellation and stopping nested propagation. |

Revisit the overrides when Kobalte declares compatible peers. Development diagnostics remain visible; the browser matrix retains any warning attachments rather than hiding them.

## Application repairs

Stores use explicit draft setters and persist the final draft, not a stale committed read. Effects separate tracked computation from side effects. Async loaders use memo/loading/error boundaries. Rendering and DOM types come from `@solidjs/web`.

Wordle preserves partially typed games across reloads, keeps keyboard nodes and pointer capture stable, records completion after the final answer/mask update, and derives suggestions without effect write-back. Settings and share settings have explicit, independent update paths. Dialogs have accessible names and an explicit result close button. Dialog centering is layout-based (`inset: 0; margin: auto`) so scale animations cannot displace finish/share surfaces while they open, including narrow viewports.

The migration also repairs the Keybr adapter's lifecycle and async initialization, unsafe typing, imperative consumers of staged signal writes, and stale reactive reads in shared components.

## Validation

`bun run check` runs all four TypeScript projects, type-aware unsafe/any lint, the production build, and browser tests covering desktop/mobile production plus the development compiler. The matrix checks routes, navigation/history/themes, games, settings, tools, CNN interaction and selected WCAG A/AA surfaces.

`bun run test:wordle` is the deeper interaction suite. Point `WORDLE_TEST_URL` at a running Wordle development or preview URL. It checks draft reload, stable pointer-keyboard nodes, controlled settings, reveal persistence, isolated share settings, nested dismissal, statistics, mobile dialog geometry, accessibility, win and loss. Clipboard writes use an explicit browser test fixture; this does not qualify the operating system clipboard. Runtime errors and Solid diagnostics fail this suite.

Use `PORTFOLIO_TEST_PORT` to select four consecutive, independently started browser-test ports. Tests do not reuse an unknown existing server. `BROWSER_EXECUTABLE`, `BROWSER_TMPDIR` and `SCREENSHOT_DIR` are configurable for local validation. Reports stay under `.tmp/solid-v2/`.

The production build retains the baseline's nonfatal Monaco chunk-size and PostCSS `from` warnings. The completed checks do not prove every browser, custom theme or future RC is bug-free.
