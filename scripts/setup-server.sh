#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# SEOSH.AI — Full server setup for clean Ubuntu 24.04
# Usage: ssh root@YOUR_SERVER 'bash -s' < scripts/setup-server.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="seosh.aijam.pro"
APP_DIR="/opt/seosh-ai"
REPO_URL="https://github.com/f0q/SEOSH_AI.git"  # ← Update this

echo "══════════════════════════════════════════════════════"
echo "  SEOSH.AI — Server Setup (Ubuntu 24.04)"
echo "══════════════════════════════════════════════════════"

# ─── 1. System updates ───────────────────────────────────
echo "→ Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Install Docker ──────────────────────────────────
echo "→ Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Install Docker Compose plugin (if not bundled)
if ! docker compose version &>/dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

# ─── 3. Install basic tools ─────────────────────────────
echo "→ Installing tools..."
apt-get install -y -qq git curl ufw fail2ban

# ─── 4. Firewall ────────────────────────────────────────
echo "→ Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP (Caddy redirect)
ufw allow 443/tcp   # HTTPS
ufw allow 443/udp   # HTTP/3 (QUIC)
ufw --force enable

# ─── 5. Fail2ban ────────────────────────────────────────
echo "→ Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# ─── 6. Clone / Pull repo ──────────────────────────────
echo "→ Setting up application..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── 7. Generate production .env ────────────────────────
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "→ Generating .env.production..."
  cp .env.production.example .env.production

  # Auto-generate secrets
  DB_PASS=$(openssl rand -hex 20)
  REDIS_PASS=$(openssl rand -hex 16)
  MINIO_PASS=$(openssl rand -hex 20)
  AUTH_SECRET=$(openssl rand -base64 32)
  ENC_SECRET=$(openssl rand -hex 16)
  ADM_SECRET=$(openssl rand -hex 16)

  sed -i "s|CHANGE_ME_STRONG_DB_PASSWORD|$DB_PASS|g" .env.production
  sed -i "s|CHANGE_ME_STRONG_REDIS_PASSWORD|$REDIS_PASS|g" .env.production
  sed -i "s|CHANGE_ME_STRONG_MINIO_PASSWORD|$MINIO_PASS|g" .env.production
  sed -i "s|CHANGE_ME_GENERATE_WITH_openssl_rand_base64_32|$AUTH_SECRET|g" .env.production
  sed -i "s|CHANGE_ME_GENERATE_WITH_openssl_rand_hex_16|$ENC_SECRET|g" .env.production
  # Fix: admin secret needs separate replacement (same placeholder used twice)
  # Second occurrence already replaced, set it explicitly
  sed -i "s|ADMIN_SECRET=.*|ADMIN_SECRET=$ADM_SECRET|" .env.production

  echo ""
  echo "╔══════════════════════════════════════════════════════"
  echo "║  .env.production generated with random secrets"
  echo "║"
  echo "║  ⚠  You MUST edit .env.production to add:"
  echo "║     - OPENROUTER_API_KEY (your real key)"
  echo "║     - TEXTRU_API_KEY (if needed)"
  echo "║     - SMTP settings (when ready)"
  echo "╚══════════════════════════════════════════════════════"
  echo ""
fi

# ─── 8. Build and start ─────────────────────────────────
echo "→ Building and starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# ─── 9. Run database migrations ─────────────────────────
echo "→ Running database migrations..."
sleep 5  # Wait for DB to be ready
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

echo ""
echo "╔══════════════════════════════════════════════════════"
echo "║  ✅ SEOSH.AI deployed successfully!"
echo "║"
echo "║  🌐 https://$DOMAIN"
echo "║"
echo "║  Next steps:"
echo "║  1. Point DNS A record for $DOMAIN → $(curl -s ifconfig.me)"
echo "║  2. Edit /opt/seosh-ai/.env.production"
echo "║     - Add your OPENROUTER_API_KEY"
echo "║  3. Restart: cd /opt/seosh-ai && docker compose -f docker-compose.prod.yml restart app"
echo "║  4. Create account → set yourself as SUPERADMIN:"
echo "║     docker compose -f docker-compose.prod.yml exec db psql -U seosh -d seosh_ai -c \"UPDATE users SET role='SUPERADMIN' WHERE email='jamal121290@gmail.com';\""
echo "╚══════════════════════════════════════════════════════"
