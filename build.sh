#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/keybr"
node ./scripts/check-workspaces.mjs
NODE_ENV=production ./node_modules/.bin/webpack
cp dist/index.html "$ROOT/keybr.html"

cd "$ROOT/wordle"
./node_modules/.bin/vite build
cp dist/index.html "$ROOT/wordle.html"

cd "$ROOT"
node ./verify-build.mjs
