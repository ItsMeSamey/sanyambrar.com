#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

ensure_deps() {
  local dir="$1" lock="$1/bun.lock" stamp="$1/node_modules/.samey-lock-sha256" wanted
  wanted="$(sha256sum "$lock" | cut -d' ' -f1)"
  if [[ -f "$stamp" ]] && [[ "$(cat "$stamp")" == "$wanted" ]]; then return; fi
  if ! command -v bun >/dev/null; then
    echo "Dependencies for $dir are missing/stale. Install Bun, then rerun ./build.sh." >&2
    exit 1
  fi
  (cd "$dir" && bun install --frozen-lockfile)
  printf '%s\n' "$wanted" > "$stamp"
}

ensure_deps "$ROOT/keybr"
ensure_deps "$ROOT/wordle"

cd "$ROOT"
node ./scripts/generate-appearance.mjs

cd "$ROOT/keybr"
node ./scripts/check-workspaces.mjs
NODE_ENV=production node ./node_modules/webpack/bin/webpack.js
cp dist/index.html "$ROOT/keybr.html"

cd "$ROOT/wordle"
node ./node_modules/typescript/bin/tsc -b tsconfig.json --pretty false
node ./node_modules/vite/bin/vite.js build
cp dist/index.html "$ROOT/wordle.html"

cd "$ROOT"
node ./scripts/generate-service-worker.mjs
node ./compress-static.mjs
node ./verify-build.mjs
node ./verify-compressed.mjs
node ./verify-site-contract.mjs
node ./verify-architecture.mjs
node ./audit-keybr-theme.mjs
