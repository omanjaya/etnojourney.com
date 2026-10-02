# Production deploy

Production runs on a VPS (Hostinger, `76.13.23.20`) next to other apps, behind
the host's Caddy (TLS, HTTP/2, compression) at `https://etnojourney.com`.

## How a change reaches production

1. A pull request merges into `main`.
2. **CI** runs (lint, types, unit and end-to-end tests).
3. When CI succeeds on `main`, **Deploy** (`.github/workflows/deploy.yml`):
   - builds the Docker image and pushes it to GHCR as
     `ghcr.io/omanjaya/etnojourney:<sha>` and `:latest`;
   - connects over SSH with a key that can only run `/opt/etnojourney/deploy.sh`
     (forced command in `root`'s `authorized_keys`), passing the commit SHA and a
     short-lived GHCR token on stdin;
   - `deploy.sh` downloads `deploy/docker-compose.prod.yml` of that commit,
     pulls the image, restarts the app (migrations run at container start),
     waits for `/api/health` and **rolls back** to the previous tag if the new one
     stays unhealthy;
   - a smoke test calls `https://etnojourney.com/api/health`.

Redeploy or roll back by hand: *Actions > Deploy > Run workflow* with a commit SHA.

GitHub secrets: `VPS_HOST`, `VPS_SSH_KEY` (deploy key), `VPS_KNOWN_HOSTS`.

## On the server (`/opt/etnojourney`)

| File | Purpose |
| --- | --- |
| `.env` | Production secrets (generated on the server, mode 600). Add Midtrans, Resend and contact details here, then `docker compose -f docker-compose.prod.yml up -d`. |
| `docker-compose.prod.yml` | Postgres 17 + the app on `127.0.0.1:3040` (refreshed by each deploy). |
| `deploy.sh` | Deploy script (forced command). Log: `deploy.log`. |
| `current-tag` | SHA currently running. |
| `backups/` | Nightly `pg_dump` (14 days). |

Caddy site block (in `/etc/caddy/Caddyfile`):

```
etnojourney.com, www.etnojourney.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3040
}
```

Cron (`/etc/cron.d/etnojourney`): trip emails daily (`/api/cron/trip-emails`
with `CRON_SECRET`) and the nightly database backup.

Useful commands:

```bash
cd /opt/etnojourney
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
tail -n 50 deploy.log
```

The catalogue was loaded once with `SEED_MODE=content` (no demo accounts or
bookings); it refuses to run again once bookings exist. Make the owner an
admin after they register: `npx tsx scripts/make-admin.ts <email>` with
`DATABASE_URL` pointing at the database through an SSH tunnel
(`ssh -L 5442:127.0.0.1:5442 root@76.13.23.20`).
