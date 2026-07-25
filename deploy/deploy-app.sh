#!/usr/bin/env bash
# Build Next.js standalone locally and upload to Oracle VM (macOS/Linux).
#
# Usage:
#   ./deploy/deploy-app.sh ubuntu@140.245.206.149 ~/.ssh/oracle-trade-ideas.key web/.env.production.local
set -euo pipefail

REMOTE="${1:?Usage: deploy-app.sh <ubuntu@ip> <key-path> [env-file]}"
KEY_PATH="${2:?}"
ENV_FILE="${3:-web/.env.production.local}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$REPO_ROOT/web"
STAGING="fitness-coach-app-upload"
REMOTE_APP="/opt/fitness-coach/app"
LOCAL_STAGE="${TMPDIR:-/tmp}/fitness-coach-standalone"

if [[ ! -f "$REPO_ROOT/$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/env.production.example to web/.env.production.local"
  exit 1
fi

cd "$WEB_DIR"
echo "==> npm ci"
npm ci

echo "==> npm run build"
cp "$REPO_ROOT/$ENV_FILE" .env.production.local
npm run build

STANDALONE="$WEB_DIR/.next/standalone"
[[ -f "$STANDALONE/server.js" ]] || { echo "Standalone build missing"; exit 1; }

rm -rf "$LOCAL_STAGE"
mkdir -p "$LOCAL_STAGE/.next"
cp -a "$STANDALONE/." "$LOCAL_STAGE/"
cp -a "$WEB_DIR/.next/static" "$LOCAL_STAGE/.next/static"
[[ -d "$WEB_DIR/public" ]] && cp -a "$WEB_DIR/public" "$LOCAL_STAGE/public"

echo "==> Upload"
ssh -i "$KEY_PATH" "$REMOTE" "rm -rf ~/$STAGING && mkdir -p ~/$STAGING"
rsync -az -e "ssh -i $KEY_PATH" "$LOCAL_STAGE/" "${REMOTE}:~/${STAGING}/"

echo "==> Install + restart"
ssh -i "$KEY_PATH" "$REMOTE" "sudo rsync -a --delete ~/$STAGING/ $REMOTE_APP/ && sudo chown -R fitness-coach:fitness-coach $REMOTE_APP && rm -rf ~/$STAGING && sudo systemctl restart fitness-coach && sudo systemctl is-active fitness-coach"

echo "==> Done. https://abstrack.duckdns.org"
