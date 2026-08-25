#!/usr/bin/env bash
# One-time Oracle VM setup for Abs-Track (run as ubuntu via SSH).
# See docs/oracle-vm-hosting-setup.md
#
# Usage:
#   scp -r deploy ubuntu@<ip>:~/fitness-coach-deploy
#   ssh ubuntu@<ip> 'bash ~/fitness-coach-deploy/vm-setup.sh'
set -euo pipefail

APP_ROOT=/opt/fitness-coach
REPO="${REPO:-$APP_ROOT/repo}"

echo "==> Creating fitness-coach system user and directories"
sudo useradd --system --create-home --shell /usr/sbin/nologin fitness-coach 2>/dev/null || true
sudo mkdir -p "$APP_ROOT"/{app,web,data/postgres,deploy}
sudo chown -R ubuntu:ubuntu "$APP_ROOT"

echo "==> Installing Node.js 22 LTS"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

echo "==> Installing Docker (if missing) for PostgreSQL"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
fi

echo "==> Installing Caddy (if missing)"
if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
fi

echo "==> Opening HTTP and HTTPS in the VM firewall"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null \
  || sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null \
  || sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "==> 2 GB swap (recommended on VM.Standard.E2.1.Micro — skip on Ampere 6GB+)"
if ! swapon --show | grep -q /swapfile; then
  if [[ ! -f /swapfile ]]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
fi

echo "==> Install systemd unit (enable after first deploy-app upload)"
if [[ -f "$REPO/deploy/fitness-coach.service" ]]; then
  sudo cp "$REPO/deploy/fitness-coach.service" /etc/systemd/system/
  sudo systemctl daemon-reload
fi

echo ""
echo "Next steps:"
echo "  1. cp deploy/env.production.example $APP_ROOT/web/.env.local && nano $APP_ROOT/web/.env.local"
echo "  2. cd $APP_ROOT && docker compose -f repo/deploy/docker-compose.prod.yml up -d"
echo "  3. Append deploy/Caddyfile.snippet to /etc/caddy/Caddyfile && sudo systemctl reload caddy"
echo "  4. From your PC: deploy/deploy-app.ps1 -Remote ubuntu@<ip> -KeyPath <key> -EnvFile web/.env.production.local"
echo "  5. ssh ... 'cd $APP_ROOT/repo/web && set -a && source $APP_ROOT/web/.env.local && set +a && npm run db:push && npm run db:seed'"
