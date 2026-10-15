#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  echo 'Create .env from .env.example and configure credentials privately first.' >&2
  exit 1
fi
npm ci --ignore-scripts --no-audit --no-fund >&2
npm run build >&2
exec node --env-file=.env dist/server.js
