#!/usr/bin/env bash
# Update DuckDNS A record for abstrack.duckdns.org (run on VM via cron every 5 min).
#
# Set in /opt/fitness-coach/web/.env.local:
#   DUCKDNS_TOKEN=<token from duckdns.org>
#   DUCKDNS_DOMAIN=abstrack
#
# Cron (as root or ubuntu):
#   */5 * * * * /opt/fitness-coach/deploy/duckdns-update.sh >> /var/log/duckdns-fitness-coach.log 2>&1

set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/fitness-coach/web/.env.local}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${DUCKDNS_TOKEN:?Set DUCKDNS_TOKEN in $ENV_FILE}"
: "${DUCKDNS_DOMAIN:=abstrack}"

curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" \
  | tr -d '\n'
echo " $(date -Iseconds) ${DUCKDNS_DOMAIN}.duckdns.org"
