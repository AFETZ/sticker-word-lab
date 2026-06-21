# Деплой на VPS

Это серверный контур для Sticker Word Lab. Есть два режима:

- `DOMAIN` пустой: приложение работает напрямую на `http://SERVER_IP:8000`.
- `DOMAIN` задан: перед приложением запускается Caddy и автоматически выпускает HTTPS-сертификат.

## Быстрый деплой

На чистом Ubuntu/Debian сервере:

```bash
cd /opt
git clone <your-repo-url> sticker-word-lab
cd sticker-word-lab
DOMAIN=craft.example.com bash scripts/deploy.sh
```

Для теста без домена:

```bash
bash scripts/deploy.sh
```

Чтобы тест без домена был доступен друзьям по IP сервера:

```bash
SWL_PUBLIC_URL=http://SERVER_IP:8000 SWL_ALLOWED_ORIGINS=http://SERVER_IP:8000 bash scripts/deploy.sh
```

На общем сервере лучше брать отдельный high-port, чтобы не конфликтовать с уже запущенными сервисами:

```bash
SWL_HTTP_PORT=18080 SWL_PUBLIC_URL=http://SERVER_IP:18080 SWL_ALLOWED_ORIGINS=http://SERVER_IP:18080 bash scripts/deploy.sh
```

Если на сервере уже есть Traefik на `80/443`, используй отдельный subdomain и не запускай Caddy:

```bash
SWL_TRAEFIK_HOST=sticker.gtfinance.ru bash scripts/deploy.sh
```

Скрипт сам установит Docker Engine и Docker Compose plugin, если их нет, создаст `.env` с секретами, подготовит `backend/data`, соберет image и запустит stack.

## DNS и firewall

Для production сначала направь A/AAAA запись домена на IP сервера, потом запускай скрипт с `DOMAIN`.

Открой порты:

- `80/tcp` и `443/tcp` для домена и HTTPS.
- `8000/tcp` только для временного теста без домена.

## Переменные

Сгенерированный `.env` содержит:

```bash
DOMAIN=craft.example.com
SWL_PUBLIC_URL=https://craft.example.com
SWL_ALLOWED_ORIGINS=https://craft.example.com
SWL_ADMIN_TOKEN=<generated>
SWL_PRIVACY_SALT=<generated>
SWL_ENABLE_HSTS=1
SWL_TRUST_PROXY=1
SWL_MAX_IMAGE_BYTES=5242880
SWL_TRAEFIK_HOST=sticker.gtfinance.ru
SWL_HTTP_BIND=0.0.0.0
SWL_HTTP_PORT=18080
SWL_RUN_UID=1001
SWL_RUN_GID=1001
SWL_APP_MEMORY_LIMIT=512m
SWL_APP_CPUS=0.75
```

`.env` нельзя коммитить или отправлять наружу. Публичный шаблон лежит в `.env.example`.

Если `.env` уже создан, `DOMAIN=... bash scripts/deploy.sh` не перезапишет его. Для смены домена отредактируй `.env` вручную и запусти `bash scripts/update.sh`.

## Операции

Обновить сервер:

```bash
bash scripts/update.sh
```

Проверить health:

```bash
bash scripts/health.sh
```

Посмотреть логи:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

Сделать бэкап данных:

```bash
bash scripts/backup.sh
```

Остановить приложение:

```bash
docker compose -f docker-compose.prod.yml down
```

## Данные

Runtime cache, presets, leads и event logs лежат в `backend/data`. Директория монтируется в контейнер и игнорируется git.

## Примечания

Установка Docker следует официальному apt repository flow для Ubuntu/Debian и ставит Compose plugin package.
