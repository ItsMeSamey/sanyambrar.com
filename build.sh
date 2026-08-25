#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/keybr"
node ./scripts/check-workspaces.mjs
NODE_ENV=production node ./node_modules/webpack/bin/webpack.js
cp dist/index.html "$ROOT/keybr.html"

cd "$ROOT/wordle"
node ./node_modules/vite/bin/vite.js build
cp dist/index.html "$ROOT/wordle.html"

cd "$ROOT"
node ./verify-build.mjs
node ./audit-keybr-theme.mjs
