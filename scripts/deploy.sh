#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

APP_UID="${SWL_RUN_UID:-${APP_UID:-$(id -u)}}"
APP_GID="${SWL_RUN_GID:-${APP_GID:-$(id -g)}}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sticker-word-lab}"
export COMPOSE_PROJECT_NAME

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "This script needs root privileges or sudo." >&2
    exit 1
  fi
  SUDO="sudo"
fi

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64
  fi
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Docker is missing. Automatic install is supported for Ubuntu/Debian with apt-get." >&2
    echo "Install Docker Engine and the Compose plugin manually, then rerun this script." >&2
    exit 1
  fi

  . /etc/os-release
  if [ -z "${ID:-}" ] || [ -z "${VERSION_CODENAME:-}" ]; then
    echo "Cannot detect Linux distribution/codename from /etc/os-release." >&2
    exit 1
  fi
  case "$ID" in
    ubuntu|debian) ;;
    *)
      echo "Automatic Docker install supports Ubuntu/Debian. Detected ID=${ID}." >&2
      exit 1
      ;;
  esac

  echo "Installing Docker Engine and Docker Compose plugin..."
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl gnupg
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" | $SUDO tee /etc/apt/keyrings/docker.asc >/dev/null
  $SUDO chmod a+r /etc/apt/keyrings/docker.asc

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

  $SUDO apt-get update
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl enable --now docker
  fi
}

ensure_env() {
  if [ -f .env ]; then
    return 0
  fi

  local domain="${DOMAIN:-}"
  local public_url="${SWL_PUBLIC_URL:-}"
  local allowed_origins="${SWL_ALLOWED_ORIGINS:-}"
  local enable_hsts="${SWL_ENABLE_HSTS:-}"
  local trust_proxy="${SWL_TRUST_PROXY:-}"
  local traefik_host="${SWL_TRAEFIK_HOST:-}"
  local http_bind="${SWL_HTTP_BIND:-0.0.0.0}"
  local http_port="${SWL_HTTP_PORT:-8000}"

  if [ -n "$domain" ]; then
    public_url="${public_url:-https://${domain}}"
    allowed_origins="${allowed_origins:-https://${domain}}"
    enable_hsts="${enable_hsts:-1}"
    trust_proxy="${trust_proxy:-1}"
  elif [ -n "$traefik_host" ]; then
    public_url="${public_url:-https://${traefik_host}}"
    allowed_origins="${allowed_origins:-https://${traefik_host}}"
    enable_hsts="${enable_hsts:-1}"
    trust_proxy="${trust_proxy:-1}"
    http_bind="${SWL_HTTP_BIND:-127.0.0.1}"
  else
    public_url="${public_url:-http://127.0.0.1:8000}"
    allowed_origins="${allowed_origins:-http://127.0.0.1:8000,http://localhost:8000}"
    enable_hsts="${enable_hsts:-0}"
    trust_proxy="${trust_proxy:-0}"
  fi

  cat > .env <<EOF
DOMAIN=${domain}
SWL_PUBLIC_URL=${public_url}
SWL_ALLOWED_ORIGINS=${allowed_origins}
SWL_ADMIN_TOKEN=${SWL_ADMIN_TOKEN:-$(random_secret)}
SWL_PRIVACY_SALT=${SWL_PRIVACY_SALT:-$(random_secret)}
SWL_ENABLE_HSTS=${enable_hsts}
SWL_TRUST_PROXY=${trust_proxy}
SWL_MAX_IMAGE_BYTES=${SWL_MAX_IMAGE_BYTES:-5242880}
SWL_TRAEFIK_HOST=${traefik_host}
SWL_HTTP_BIND=${http_bind}
SWL_HTTP_PORT=${http_port}
SWL_RUN_UID=${SWL_RUN_UID:-$APP_UID}
SWL_RUN_GID=${SWL_RUN_GID:-$APP_GID}
SWL_APP_MEMORY_LIMIT=${SWL_APP_MEMORY_LIMIT:-512m}
SWL_APP_MEMORY_RESERVATION=${SWL_APP_MEMORY_RESERVATION:-128m}
SWL_APP_CPUS=${SWL_APP_CPUS:-0.75}
SWL_CADDY_MEMORY_LIMIT=${SWL_CADDY_MEMORY_LIMIT:-128m}
SWL_CADDY_MEMORY_RESERVATION=${SWL_CADDY_MEMORY_RESERVATION:-32m}
SWL_CADDY_CPUS=${SWL_CADDY_CPUS:-0.25}
EOF

  chmod 600 .env || true
  echo "Created .env with generated secrets."
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

prepare_data_dir() {
  mkdir -p backend/data
  chmod -R u+rwX,g+rwX backend/data || true
  if [ "$(id -u)" -eq 0 ]; then
    chown -R "${APP_UID}:${APP_GID}" backend/data || true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo chown -R "${APP_UID}:${APP_GID}" backend/data || true
  fi
}

compose_args() {
  if [ -n "${DOMAIN:-}" ]; then
    printf '%s\n' "-f" "docker-compose.prod.yml"
  elif [ -n "${SWL_TRAEFIK_HOST:-}" ]; then
    printf '%s\n' "-f" "docker-compose.yml" "-f" "docker-compose.traefik.yml"
  else
    printf '%s\n' "-f" "docker-compose.yml"
  fi
}

install_docker_if_missing
ensure_env
load_env
prepare_data_dir

mapfile -t COMPOSE_FILES < <(compose_args)
docker compose "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker compose "${COMPOSE_FILES[@]}" ps

echo
echo "Deploy complete."
echo "Public URL: ${SWL_PUBLIC_URL}"
if [ -z "${DOMAIN:-}" ]; then
  if [ -n "${SWL_TRAEFIK_HOST:-}" ]; then
    echo "Traefik route: https://${SWL_TRAEFIK_HOST}"
  else
    echo "No DOMAIN set: open TCP port ${SWL_HTTP_PORT:-8000} or set DOMAIN/SWL_TRAEFIK_HOST and rerun for HTTPS."
  fi
else
  echo "HTTPS is managed by Caddy. Make sure DNS A/AAAA records point to this server."
fi
echo "Admin token is stored in .env as SWL_ADMIN_TOKEN."
