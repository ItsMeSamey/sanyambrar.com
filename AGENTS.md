# Portfolio development

- Build with Bun; application code targets browsers, not Bun APIs.
- Use Solid 2 core from `solid-js` and DOM/JSX types from `@solidjs/web`.
- Install with `bun install --ignore-scripts --frozen-lockfile`; never patch `node_modules`.
- Writes are staged. Pass computed next values to imperative APIs instead of reading a signal immediately after setting it.
- Use draft store setters, split `createEffect(compute, apply)`, and async memos with `Loading`/`Errored`.
- Lifecycle callbacks return only a cleanup function or `undefined`. Do not accidentally return DOM promises.
- Preserve the shared theme, root-swap navigation, local game saves and lazy editor/worker loading.
- Run `bun run check` before committing. Type checking, typed linting and browser interaction tests are separate checks.
- `scripts/dev.mjs` uses the same Vite compiler as production. Run a build first for shared static assets.
- Regenerate and commit `docs/` with source changes. Do not deploy or push without permission.
- Keep experiments under `.tmp/`. Screenshots belong in `/home/a/Pictures/Screenshots/` and should identify the tested commit.
- Keybr book previews must not advance storybook progress; cover reload, next/previous, settings-preview, and book-switch round trips when changing book navigation.
- Keybr book catalogs must use a searchable responsive library picker; do not regress large catalogs to a flat option list.
- Reverb UI mock changes must be checked against a fresh installed-app capture; preserve the Compose dimensions, dynamic-device colors, 1024px noise tile phase, and buffer state styling.
- Responsive QA must include extreme widths, heights, and aspect ratios, and assert internal segmented-control and overlay geometry; page-level horizontal-overflow checks alone miss malformed wrapping and clipped fixed surfaces.
- Native popovers need a single owner of native open/close state; do not combine a `popovertarget` auto-open with an effect that calls `showPopover`/`togglePopover` for the same click.
