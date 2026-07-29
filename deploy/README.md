# Abs-Track production deploy (Oracle Cloud VM)

| File | Purpose |
|------|---------|
| [env.production.example](env.production.example) | Template — Firebase, Postgres, DuckDNS, Gemini |
| [deploy-app.ps1](deploy-app.ps1) | Windows: build standalone Next.js + upload + restart |
| [redeploy.bat](redeploy.bat) | Double-click / CLI redeploy to Oracle VM |
| [deploy-app.sh](deploy-app.sh) | macOS/Linux deploy |
| [migrate-db.ps1](migrate-db.ps1) | Push schema + seed on VM |
| [sql/2026-07-26-vault-products.sql](sql/2026-07-26-vault-products.sql) | Vault catalog tables |
| [sql/2026-07-26-vault-catalog-settings.sql](sql/2026-07-26-vault-catalog-settings.sql) | Storefront marketing settings |
| [vm-setup.sh](vm-setup.sh) | One-time VM: user, Node, Docker, swap |
| [vm-setup-caddy.sh](vm-setup-caddy.sh) | Append Caddy block for abstrack.duckdns.org |
| [fitness-coach.service](fitness-coach.service) | systemd unit (port 8030) |
| [docker-compose.prod.yml](docker-compose.prod.yml) | Postgres on VM (127.0.0.1:5432) |
| [Caddyfile.snippet](Caddyfile.snippet) | HTTPS reverse proxy |
| [duckdns-update.sh](duckdns-update.sh) | Cron script for DuckDNS IP updates |
| [import-firebase-admin.ps1](import-firebase-admin.ps1) | Import service account JSON into env files |

**Full guide:** [../docs/oracle-vm-hosting-setup.md](../docs/oracle-vm-hosting-setup.md)

| [sql/2026-07-29-coach-broadcast-expiry-video.sql](sql/2026-07-29-coach-broadcast-expiry-video.sql) | Broadcast video/expiry + tenant retention columns |

**Nightly data retention purge (optional):** set `CRON_SECRET` on the VM, then add a daily cron job:

```bash
0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://abstrack.duckdns.org/api/cron/purge-retention
```

Coaches can also run cleanup manually from Settings → Data retention & storage.

**Firebase:** [../docs/firebase-production-setup.md](../docs/firebase-production-setup.md)
