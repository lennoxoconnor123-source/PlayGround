#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
time -p cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
STATIC_DIR="$PROJECT_DIR/dist"
export PORT STATIC_DIR

run_timed() {
  /usr/bin/time -p "$@"
}

run_timed npm install --ignore-scripts --no-audit --no-fund --package-lock=false
run_timed npm run build

metadata_dir="/home/runner/work/_temp/omgithub-web"
deployment_file="$metadata_dir/deployment-output.json"
run_timed mkdir -p "$metadata_dir"
run_timed node -e 'const fs=require("fs"); const [project,directory,file]=process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({project,directory}, null, 2)+"\n");' "$PROJECT_DIR" "$STATIC_DIR" "$deployment_file"

run_timed npm start
