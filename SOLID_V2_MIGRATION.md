# Solid 2 migration

Pinned runtime: `solid-js` and `@solidjs/web` **2.0.0-rc.6**. Compiler: `@solidjs/vite-plugin` **3.0.0-next.39**. The site, Wordle and the vendored Keybr port use the same runtime generation.

## Upstream compatibility

| Dependency | Finding | Resolution |
| --- | --- | --- |
| `vite-plugin-solid` | Solid 1 compiler integration | Replaced by the official Solid 2 Vite plugin. |
| `lucide-solid` | Published package still targets Solid 1 | Replaced by `lucide` 1.41.0 geometry and a small native Solid 2 SVG renderer. |
| `@kobalte/core` stable | Supports Solid 1, not Solid 2 | Pinned 2.0.0-alpha.1; this is experimental, not a stable compatibility guarantee. |
| Kobalte alpha peers | Core declares exact rc.3 peers; its utils package declares rc.0 peers | Explicit overrides unify core, web and signals on rc.6. These overrides do not constitute upstream support. |
| Kobalte alpha Slider | An isolated controlled slider remains at 6 after ArrowRight/ArrowUp, without invoking onChange, on rc.6 | Wordle uses styled native range inputs. The unused slider wrapper was removed. |
| Kobalte alpha diagnostics | Some components still produce `STRICT_READ_UNTRACKED` development warnings | Browser tests retain these warnings as attachments. They are not suppressed in application code. |

No dependency files are patched. `bun.lock` is committed; lifecycle scripts are disabled during installation. Revisit the overrides when Kobalte publishes a release declaring the current RC peers.

## Application changes

Store writes now use draft setters. Effects separate tracked computation from side effects. Async loaders use async memos with loading/error boundaries. DOM types and rendering come from `@solidjs/web`. Imperative consumers receive calculated next values rather than stale staged reads.

The migration also fixes lifecycle cleanup returning a DOM promise, an async Keybr initializer escaping its loading boundary, error reporting during render, missing accessible Wordle switches, an unnamed result dialog, low-contrast small navigation text, and favicon requests resolving against a changed SPA path.

## Validation

Run `bun run check`: all TypeScript projects, type-aware unsafe/any lint, production generation and browser regressions. Browser tests cover desktop and mobile production output plus the development compiler, navigation/history/themes, game state and settings, and WCAG A/AA checks for the selected surfaces. A successful run is evidence for those checks, not proof that every browser, custom theme or future RC is bug-free.
