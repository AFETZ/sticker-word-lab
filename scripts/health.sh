#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

url="${SWL_PUBLIC_URL:-http://127.0.0.1:8000}"
curl -fsS "${url%/}/api/health"
echo
