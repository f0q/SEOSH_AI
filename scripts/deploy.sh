#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# SEOSH.AI — Quick redeploy (run ON the server)
# Usage: cd /opt/seosh-ai && bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/seosh-ai"
cd "$APP_DIR"

echo "→ Pulling latest code..."
git pull

echo "→ Rebuilding app..."
docker compose -f docker-compose.prod.yml --env-file .env.production build app --no-cache

echo "→ Restarting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "→ Running migrations..."
sleep 5
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

echo "✅ Deploy complete! https://seosh.aijam.pro"
