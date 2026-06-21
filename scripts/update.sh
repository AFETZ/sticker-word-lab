#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sticker-word-lab}"
export COMPOSE_PROJECT_NAME

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo ".env is missing. Run scripts/deploy.sh first." >&2
  exit 1
fi

if [ -d .git ]; then
  git pull --ff-only
fi

mkdir -p backend/data

if [ -n "${DOMAIN:-}" ]; then
  docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
  docker compose -f docker-compose.prod.yml ps
elif [ -n "${SWL_TRAEFIK_HOST:-}" ]; then
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build --remove-orphans
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml ps
else
  docker compose -f docker-compose.yml up -d --build --remove-orphans
  docker compose -f docker-compose.yml ps
fi
