#!/bin/bash
set -euo pipefail

# Node.js 23+ requires extra flags because of experimental-require-module default.
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [[ "$NODE_VERSION" -ge 23 ]]; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --no-experimental-require-module --no-experimental-detect-module --no-warnings"
fi

# Prefer the locally-linked Jest. `npx jest` may silently pull jest@30 which
# rejects the ts-jest@29 preset (seen on fresh clones where node_modules/.bin
# is not yet populated). Fall back to npx only if the local binary is missing.
LOCAL_JEST="node_modules/.bin/jest"
if [[ -x "$LOCAL_JEST" ]]; then
  exec "$LOCAL_JEST" "$@"
fi

echo "jest-wrapper: local jest binary missing — run 'npm ci' first." >&2
echo "jest-wrapper: falling back to npx jest (may pull jest@30 and fail)." >&2
exec npx jest "$@"
