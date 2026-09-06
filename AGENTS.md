# Portfolio

- `bun run build` generates tracked `docs/`, the GitHub Pages root. Commit source and regenerated output together.
- `bun run check` runs all four TypeScript projects, type-aware lint, production generation and the browser matrix.
- Read `SOLID_V2_MIGRATION.md` before changing framework pins; Kobalte is experimental. Never patch dependency files or hide diagnostics.
- Keep browser tests on their own servers. `PORTFOLIO_TEST_PORT` selects four consecutive test ports.
- Keep temporary work in `.tmp/`, worktrees in `.worktree/`, and diagnostic screenshots in `~/Pictures/Screenshots/`.
- Do not commit package-manager lockfiles in this repository; keep them ignored and validate installs without frozen-lockfile mode.
