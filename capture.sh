#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
time -p cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR for screenshot output.}"
: "${RUNTIME_DIR:?RUNTIME_DIR must point to the web runtime scripts.}"

run_timed() {
  /usr/bin/time -p "$@"
}

export CAPTURE_STRICT=1
export CAPTURE_READY_SELECTOR='#app'
run_timed node "$RUNTIME_DIR/scripts/default-capture.mjs"
