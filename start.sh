#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to the worker metadata directory}"

/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
fi

# This project is directly-served HTML/CSS/JavaScript and has no build step.
STATIC_DIR="$PROJECT_DIR"
[[ -f "$STATIC_DIR/index.html" ]] || { echo "Static entry point not found: $STATIC_DIR/index.html" >&2; exit 1; }
export STATIC_DIR

/usr/bin/time -p node -e 'const fs=require("node:fs");const path=require("node:path");const project=process.argv[1];const directory=process.env.STATIC_DIR;fs.writeFileSync(path.join(process.env.OPENCODE_WEB_DIR,"deployment-output.json"),JSON.stringify({project,directory}));' "$PROJECT_DIR"
exec /usr/bin/time -p node "$PROJECT_DIR/server.js"
