#!/usr/bin/env bash
# Append Abs-Track Caddy site block and reload (run once on VM).
set -euo pipefail

SNIPPET="${1:-/opt/fitness-coach/repo/deploy/Caddyfile.snippet}"
CADDYFILE=/etc/caddy/Caddyfile

if grep -q "abstrack.duckdns.org" "$CADDYFILE" 2>/dev/null; then
  echo "Caddy already has abstrack.duckdns.org"
else
  echo "Appending $SNIPPET to $CADDYFILE"
  sudo tee -a "$CADDYFILE" < "$SNIPPET" >/dev/null
fi

sudo caddy validate --config "$CADDYFILE"
sudo systemctl reload caddy
echo "Caddy reloaded — https://abstrack.duckdns.org"
