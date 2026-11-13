#!/usr/bin/env bash
# Dev helper: build this UI and hot-swap it into a running Dispatcharr container.
#   ./scripts/deploy-to-container.sh [container-name]
set -euo pipefail
CONTAINER="${1:-dispatcharr}"
cd "$(dirname "$0")/.."
npm run build
docker exec "$CONTAINER" sh -c 'find /app/frontend/dist -mindepth 1 -delete'
docker cp dist/. "$CONTAINER":/app/frontend/dist/
docker exec "$CONTAINER" bash -c 'source /etc/profile.d/dispatcharr.sh; export DJANGO_SECRET_KEY="$(tr -d "\r\n" < /data/jwt)"; cd /app && python manage.py collectstatic --noinput >/dev/null'
echo "Deployed to $CONTAINER - reload the page."
