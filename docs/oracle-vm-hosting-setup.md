# Hosting Abs-Track on Oracle Cloud (Always Free VM)

Same pattern as [trade_ideas](../../trade_ideas/docs/oracle-vm-hosting-setup.md) and [tax_optimize](../../tax_optimize/docs/oracle-vm-hosting-setup.md): **Caddy + DuckDNS + systemd**, with Next.js on port **8030** and PostgreSQL in Docker.

**Production URL:** `https://abstrack.duckdns.org`

**Important:** Day-to-day deploys use **SSH only** — you do not need Oracle Cloud Console login after the VM exists. Console access is only required to create a **new** VM or change networking.

## Architecture

```
Browser → https://abstrack.duckdns.org
              ↓
         Caddy :443
              ↓
    Next.js standalone (127.0.0.1:8030)
              ↓
    PostgreSQL Docker (127.0.0.1:5432)
              ↓
    Firebase Auth + Storage (Google cloud)
              ↓
    Gemini API (meal photos)
```

| App | Port | Hostname |
|-----|------|----------|
| trade_ideas | 8010 | trade-ideas.duckdns.org |
| tax_optimize | 8020 | tax-optimize.duckdns.org |
| **fitness_coach** | **8030** | **abstrack.duckdns.org** |

## VM sizing

| Shape | RAM | Verdict for Abs-Track |
|-------|-----|------------------------|
| VM.Standard.E2.1.Micro | 1 GB | **Staging/demo only** — enable swap; Postgres limited to 384 MB |
| VM.Standard.A1.Flex 2 OCPU / 12 GB | 12 GB | **Recommended for Helna pilot** (~30 clients) |

Shared micro VM (140.245.206.149) is acceptable for **internal demo** while Oracle 2FA is unavailable. Move to a dedicated Ampere VM before production pilot.

---

## 1. DuckDNS — `abstrack.duckdns.org`

1. Sign in at [duckdns.org](https://www.duckdns.org).
2. Add subdomain **`abstrack`** → your VM public IP (e.g. `140.245.206.149`).
3. Copy your **DuckDNS token** from the account page.
4. On the VM, add to `/opt/fitness-coach/web/.env.local`:

   ```bash
   DUCKDNS_TOKEN=your-token-here
   DUCKDNS_DOMAIN=abstrack
   ```

5. Install cron to keep IP updated after reboots:

   ```bash
   sudo cp /opt/fitness-coach/repo/deploy/duckdns-update.sh /opt/fitness-coach/deploy/
   sudo chmod +x /opt/fitness-coach/deploy/duckdns-update.sh
   echo '*/5 * * * * root /opt/fitness-coach/deploy/duckdns-update.sh >> /var/log/duckdns-abstrack.log 2>&1' | sudo tee /etc/cron.d/duckdns-abstrack
   ```

Verify: `dig +short abstrack.duckdns.org` should return your VM IP.

---

## 2. Firebase production (required for live Google auth)

Follow **[firebase-production-setup.md](firebase-production-setup.md)** before filling env files.

Summary:

1. Create Firebase project (separate from any billed GCP Gemini project).
2. Enable **Google Sign-In** and **Storage**.
3. Add authorized domain: **`abstrack.duckdns.org`**
4. Copy web config → `NEXT_PUBLIC_FIREBASE_*`
5. Generate service account key → `FIREBASE_*` admin vars

---

## 3. One-time VM setup

SSH in (no Console needed if VM already exists):

```powershell
ssh -i $env:USERPROFILE\.ssh\oracle-trade-ideas.key ubuntu@140.245.206.149
```

Clone repo and run setup:

```bash
sudo mkdir -p /opt/fitness-coach
sudo chown ubuntu:ubuntu /opt/fitness-coach
git clone git@github.com:YOUR_ORG/fitness_coach.git /opt/fitness-coach/repo
bash /opt/fitness-coach/repo/deploy/vm-setup.sh
```

Create production secrets on VM:

```bash
cp /opt/fitness-coach/repo/deploy/env.production.example /opt/fitness-coach/web/.env.local
nano /opt/fitness-coach/web/.env.local
# Set POSTGRES_PASSWORD, DATABASE_URL, all FIREBASE_* , GEMINI_API_KEY
sudo chown fitness-coach:fitness-coach /opt/fitness-coach/web/.env.local
sudo chmod 600 /opt/fitness-coach/web/.env.local
```

Start PostgreSQL:

```bash
cd /opt/fitness-coach/repo
export $(grep -v '^#' /opt/fitness-coach/web/.env.local | xargs)
docker compose -f deploy/docker-compose.prod.yml up -d
docker compose -f deploy/docker-compose.prod.yml ps
```

Enable systemd + Caddy:

```bash
sudo cp /opt/fitness-coach/repo/deploy/fitness-coach.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fitness-coach
bash /opt/fitness-coach/repo/deploy/vm-setup-caddy.sh
```

Migrate database (from your PC — see step 4, or on VM after `npm ci` in repo/web):

```powershell
deploy/migrate-db.ps1 -Remote ubuntu@140.245.206.149 -KeyPath $env:USERPROFILE\.ssh\oracle-trade-ideas.key
```

---

## 4. Deploy app (from your Windows PC)

Create local build env (Firebase `NEXT_PUBLIC_*` baked into bundle):

```powershell
cd fitness_coach
copy deploy\env.production.example web\.env.production.local
# Edit web\.env.production.local — fill Firebase client keys
```

Deploy:

```powershell
deploy/deploy-app.ps1 `
  -Remote ubuntu@140.245.206.149 `
  -KeyPath $env:USERPROFILE\.ssh\oracle-trade-ideas.key `
  -EnvFile web\.env.production.local
```

Re-deploy after code changes — same command. Restart only:

```powershell
deploy/deploy-app.ps1 -Remote ubuntu@140.245.206.149 -KeyPath $env:USERPROFILE\.ssh\oracle-trade-ideas.key -RestartOnly
```

---

## 5. Verify production

| Check | Command / URL |
|-------|----------------|
| Service running | `ssh ... 'sudo systemctl status fitness-coach'` |
| Postgres healthy | `docker ps` → `fitness-coach-postgres` |
| HTTPS | https://abstrack.duckdns.org |
| Google login | `/login` → Sign in with Google |
| Coach role | Sign in with email listed in `COACH_EMAILS` |
| Dev fallback | Dev login disabled when `NODE_ENV=production` |

---

## 6. Environment file reference

| File | Location | Purpose |
|------|----------|---------|
| `deploy/env.production.example` | Template | All production vars documented |
| `web/.env.production.local` | Your PC | Build-time `NEXT_PUBLIC_*` (not committed) |
| `/opt/fitness-coach/web/.env.local` | VM | Runtime secrets for systemd + Postgres |

---

## 7. Troubleshooting

**502 from Caddy** — Next.js not listening:

```bash
sudo journalctl -u fitness-coach -n 50 --no-pager
curl -sI http://127.0.0.1:8030
```

**OOM on micro VM** — confirm swap: `free -h`. Reduce Postgres memory in `docker-compose.prod.yml` or upgrade to Ampere.

**Firebase auth fails** — confirm `abstrack.duckdns.org` is in Firebase **Authorized domains** and `NEXT_PUBLIC_*` match the Firebase web app used at build time (re-run `deploy-app.ps1` after fixing).

**Database connection** — `DATABASE_URL` must use `127.0.0.1:5432` on the VM, not `localhost:5435`.

---

## 8. Dedicated Ampere VM (when Oracle Console access restored)

1. Console → Create Ampere A1 (2 OCPU / 12 GB).
2. Reserve public IP → update DuckDNS `abstrack` A record.
3. Repeat steps 3–5 on new VM.
4. `pg_dump` from old VM → restore on new VM.
5. Update deploy scripts with new IP (or keep DuckDNS only).

Total cost: **$0/month** on Always Free.
