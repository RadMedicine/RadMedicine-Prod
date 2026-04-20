# Fly.io Deploy Runbook — RadMedicine

*Written 2026-04-19. First deploy scheduled Tuesday 2026-04-21 (pending Fly billing activation).*

This is the step-by-step for the first Fly deploy of `radmedicine`. It assumes the repo state as of the 2026-04-19 evening Code session: Dockerfile, fly.toml, .dockerignore all present; `output: "standalone"` configured; `NEXT_PUBLIC_SITE_URL` wired as a build-arg with default `https://radmedicine.fly.dev`.

All commands run from `C:\Users\jon\OneDrive\Desktop\RadMedicine\app` in Git Bash.

---

## Before Tuesday

1. **Activate Fly billing.** `radmedicine` app can't be created until billing is live on the Fly account.
2. **(Optional) Add Docker bin dir to system PATH.** If `docker` isn't on PATH in bash, Docker Desktop's installer didn't propagate it. A Windows reboot fixes it. Without the fix, prefix each docker command with `PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"`.

---

## Local rehearsal (already done 2026-04-19)

The full Docker image was built and run locally against the real Supabase instance on 2026-04-19 before the deploy was deferred. Smoke results: hero, `/search` with 10 seeded clinics, `/admin` middleware redirect, `/opengraph-image`, `/sitemap.xml`, `/sign-in`, `/for-clinics`, `/waitlist`, `/onboarding` all green. Zero runtime warnings in container logs.

If the repo has moved since then and you want to re-rehearse before deploying, run the local container commands in the "Local verification (optional)" section at the bottom of this doc.

---

## Deploy steps

### 1. Verify Fly CLI is authenticated

```bash
flyctl auth whoami
```

If this errors, run `flyctl auth login` — opens a browser for OAuth.

### 2. Create the Fly app

```bash
flyctl apps create radmedicine
```

If `radmedicine` is taken, Fly errors. Pick a variant (e.g. `radmedicine-app`) and:
- Update `app = "..."` at the top of `fly.toml`.
- Update the default on this line in `Dockerfile`:
  ```
  ARG NEXT_PUBLIC_SITE_URL=https://radmedicine.fly.dev
  ```
  to match the new subdomain.

### 3. Generate a fresh production `NEXTAUTH_SECRET`

Do NOT reuse the local `.env.local` secret. Generate a new one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output.

### 4. Set runtime secrets

Values for `DATABASE_URL` and `DIRECT_URL` are in `.env.local` — copy from there. `ADMIN_EMAILS` can also be copied from `.env.local`.

```bash
flyctl secrets set \
  DATABASE_URL="<paste DATABASE_URL from .env.local>" \
  DIRECT_URL="<paste DIRECT_URL from .env.local>" \
  NEXTAUTH_SECRET="<paste freshly-generated secret from step 3>" \
  NEXTAUTH_URL="https://radmedicine.fly.dev" \
  ADMIN_EMAILS="<paste ADMIN_EMAILS from .env.local>" \
  --app radmedicine
```

**Note on `#` characters:** `flyctl secrets set` via argv is safe for any value including `#`. Don't use `flyctl secrets import` — it truncates unquoted `#` when piping through shells. Current `.env.local` values don't contain `#`, but this matters if secrets ever rotate.

Deferred (stay stubbed per the current Beta posture — do NOT set yet):
- `POSTMARK_API_KEY`, `POSTMARK_FROM_EMAIL`, `POSTMARK_MESSAGE_STREAM` — parked pending sender domain decision.
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_SRC` — gated on hosted Plausible account and DNS (waits on domain credentials).

When those unpark, remember that `NEXT_PUBLIC_*` vars are inlined at build time, not read at runtime. Activating Plausible requires a redeploy with the value as a `--build-arg`, not a `flyctl secrets set`.

### 5. Deploy

```bash
flyctl deploy
```

First build takes 3–6 minutes on the remote builder. Expect no errors — the image has been built and run locally end-to-end.

### 6. Verify

```bash
flyctl status
flyctl logs
```

Then open https://radmedicine.fly.dev in a browser. Confirm:

- Hero renders with terracotta italic on "delivered" (Young Serif → Source Serif 4 italic fallback).
- `/search` lists the 10 seeded Colorado clinics.
- `/admin` redirects to `/sign-in?from=/admin` (middleware gate).
- `/sitemap.xml` returns absolute `https://radmedicine.fly.dev/` URLs.
- `/opengraph-image` returns a PNG.

---

## Custom domain cutover (radmedicine.io — separate step, after domain credentials are in hand)

This is NOT part of the first deploy. Do it after GoDaddy credentials are received and Plausible DNS is already sequenced.

1. Tell Fly about the domain:
   ```bash
   flyctl certs add radmedicine.io --app radmedicine
   flyctl certs add www.radmedicine.io --app radmedicine
   ```
2. Point DNS:
   - A record `radmedicine.io` → the Fly IPv4 shown in `flyctl ips list`.
   - AAAA record `radmedicine.io` → the Fly IPv6.
   - CNAME `www.radmedicine.io` → `radmedicine.fly.dev`.
3. Wait for cert issuance:
   ```bash
   flyctl certs show radmedicine.io --app radmedicine
   ```
4. Update build-time `NEXT_PUBLIC_SITE_URL` and runtime `NEXTAUTH_URL`:
   ```bash
   flyctl secrets set NEXTAUTH_URL="https://radmedicine.io" --app radmedicine
   flyctl deploy --build-arg NEXT_PUBLIC_SITE_URL=https://radmedicine.io
   ```
   The `--build-arg` is required because `NEXT_PUBLIC_SITE_URL` is inlined into the client bundle and sitemap at build time.
5. Update Cowork so `positioning-brief.md`, `HANDOFF_PROTOCOL.md`, and any OG metadata references track the new canonical URL.

---

## Troubleshooting

### "app name already taken"
See step 2 above — pick a variant and update `fly.toml` + `Dockerfile`.

### Build fails at `npm run build` with "DATABASE_URL is not set"
Should not happen — `src/lib/db/client.ts` tolerates missing `DATABASE_URL` when `NEXT_PHASE === "phase-production-build"`. If it does, check that Next.js is setting `NEXT_PHASE` during the build step, or re-verify the client.ts build-phase guard is still present.

### `/opengraph-image` returns 500 at runtime
Confirm `export const runtime = "edge"` is still in `app/opengraph-image.tsx`. Flipping to `nodejs` actively breaks the build (`@vercel/og` trips `fileURLToPath(Invalid URL)` during prerender). Middleware and `/opengraph-image` both stay on edge on Fly — `next start` runs edge routes in an embedded V8 sandbox inside the Node server, same as Vercel. This was corrected 2026-04-19; see `app/CLAUDE.md` and `PROJECT_PLAN.md` runtime notes.

### Health check failing on `/`
Check `flyctl logs` — likely a DB connectivity issue (Supabase unreachable from the Fly region). The homepage has a `safe()` fallback wrapper that renders empty state rather than 500ing, so if the health check returns non-200, it's a harder problem than DB — possibly bundle/runtime error. Pull logs.

### Secrets don't take effect
`flyctl secrets set` triggers an automatic release. Confirm with `flyctl releases list`. If the release didn't happen, run `flyctl deploy` manually.

---

## Post-deploy: things to hand back to Cowork

After a successful first deploy, report back to Cowork:

- Confirmed Fly deploy URL (almost certainly `https://radmedicine.fly.dev`, unless app name fallback was needed).
- Any env-var secret name changes vs. this runbook (should be none).
- Any changes to the PII compartmentalization story during deploy (should be none — one Supabase pooled connection at `:6543`, `pgbouncer=true`, `prepare: false`; module-layer schema enforcement unchanged).

---

## Local verification (optional, before or after deploy)

If you want to re-rehearse the exact image Fly will run:

```bash
# Build
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
docker build -t radmedicine:local .

# Run (source env values from .env.local)
docker run -d --name radmedicine-local -p 8080:8080 \
  -e DATABASE_URL="<from .env.local>" \
  -e DIRECT_URL="<from .env.local>" \
  -e NEXTAUTH_SECRET="<from .env.local>" \
  -e NEXTAUTH_URL="http://localhost:8080" \
  -e ADMIN_EMAILS="<from .env.local>" \
  radmedicine:local

# Smoke
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/search

# Inspect logs
docker logs radmedicine-local

# Stop and remove when done
docker rm -f radmedicine-local
```

---

## What's in the repo for Fly (for future-Claude orienting)

- `Dockerfile` — Node 20 alpine, multi-stage (deps → builder → runner), uses `output: "standalone"`. Runs as non-root `nextjs` user on port 8080.
- `fly.toml` — `radmedicine`, primary_region `iad`, shared-cpu-1x 512MB, `min_machines_running = 1`, health check `GET /`.
- `.dockerignore` — excludes node_modules, .next, .env.local, tests, docs, Dockerfile itself.
- `next.config.mjs` — `output: "standalone"` (and nothing else).
- `public/.gitkeep` — keeps `public/` present so the Dockerfile's `COPY --from=builder /app/public ./public` doesn't fail.
- `src/lib/db/client.ts` — guards the DATABASE_URL throw behind `NEXT_PHASE !== "phase-production-build"` so Docker build succeeds without runtime secrets.
