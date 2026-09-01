#!/bin/bash
# Runs ON the Hostinger server (piped in as stdin over SSH by
# .github/workflows/deploy-hostinger.yml). Not meant to be run standalone
# without the two positional args below.
#
# $1 = app directory on the server (e.g. /home/u428186913/theuniqueexpo)
# $2 = git branch/ref to deploy
#
# See the hbuilds .env.local caveat below for why hbuilds' own independent
# build can still occasionally fail even with the refresher running.
set -euo pipefail

APP_DIR="$1"
DEPLOY_REF="$2"

cd "$APP_DIR"

# A non-interactive SSH command doesn't source .bashrc/.profile, so
# nvm-installed node/npm/pm2 aren't on PATH by default — load nvm explicitly.
# Needed early: the hbuilds refresher below is managed via pm2.
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm still not found after loading nvm. Is Node installed another way (not nvm)?" >&2
  exit 1
fi

# Hostinger's real production serving mechanism is Passenger/hbuilds, which
# builds from `main` on its own (webhook-driven) independently of this
# script's own SSH-driven build+PM2 restart below. Diagnostics found that
# hbuilds' build kept failing (and so kept leaving the live site on an old,
# stale build) once pages started needing DB access at build time for ISR:
# hbuilds' checkout at hbuilds/source/repository has no .env.local of its
# own, so Next.js falls back to default DB creds and every prerender of a
# DB-backed page fails with ER_ACCESS_DENIED_ERROR.
#
# IMPORTANT CAVEAT (confirmed by diagnostics, not just suspected): hbuilds
# rebuilds source/repository from scratch on every build -- it has no
# persistent .git, so it must be a fresh clone/extract each time, and this
# recreation can happen at literally any moment, wiping any .env.local we
# placed there. A background refresher loop (below) narrows this race but
# CANNOT close it completely: however tight the interval, there is always
# a window between hbuilds wiping the directory and our next cycle where a
# build reading .env.local at that exact instant will fail. This has been
# observed directly: builds have failed with .env.local completely absent
# even with the refresher running continuously.
#
# The only fully robust fix is configuring DB_HOST/DB_USER/DB_PASSWORD/
# DB_NAME/DB_SOCKET as persistent environment variables on hbuilds' Node.js
# app directly in Hostinger's hPanel (Websites -> theuniqueexpo.com -> Node.js
# app settings), which survive any checkout wipe since they're not a file in
# source/repository at all. That's a manual one-time step outside SSH/git
# access. Until it's done, this refresher is a (tightened, but incomplete)
# mitigation, not a guarantee.
#
# `crontab` isn't available on this shared-hosting shell (command not
# found), so use pm2 to keep the refresher running instead -- pm2 is
# already proven to persist here across deploys (it's what runs the main
# app itself, restarted/saved a few lines below). `pm2 restart` is a
# no-op-safe way to pick up a changed script body on redeploys, since the
# process is identified by name rather than by file path.
HBUILDS=~/domains/theuniqueexpo.com/hbuilds
if [ -f "$APP_DIR/.env.local" ]; then
  # hbuilds can be mid-rebuild at any instant, so source/repository can
  # vanish between this check and the cp itself -- don't let that transient
  # race (under set -e) abort the whole deploy; the refresher loop below is
  # what actually matters long-term, and it re-checks the directory itself.
  if [ -d "$HBUILDS/source/repository" ]; then
    # Write to a temp file and mv it into place atomically -- a separate
    # cp-then-append left a window where hbuilds could read a valid file
    # that was missing DB_SOCKET (a build failed exactly this way: real
    # credentials, but a TCP 'localhost' attempt instead of the socket).
    # mv on the same filesystem is atomic, so readers only ever see the
    # old complete file or the new complete file, never a partial one.
    { cat "$APP_DIR/.env.local"; printf '\nDB_SOCKET=/var/lib/mysql/mysql.sock\n'; } \
      > "$HBUILDS/source/repository/.env.local.tmp" 2>/dev/null \
      && mv "$HBUILDS/source/repository/.env.local.tmp" "$HBUILDS/source/repository/.env.local" 2>/dev/null || true
  fi

  cat > "$HOME/.hbuilds-env-refresh.sh" <<REFRESHEOF
#!/bin/bash
while true; do
  if [ -d "$HBUILDS/source/repository" ]; then
    { cat "$APP_DIR/.env.local"; printf '\nDB_SOCKET=/var/lib/mysql/mysql.sock\n'; } \
      > "$HBUILDS/source/repository/.env.local.tmp" 2>/dev/null \
      && mv "$HBUILDS/source/repository/.env.local.tmp" "$HBUILDS/source/repository/.env.local" 2>/dev/null || true
  fi
  sleep 2
done
REFRESHEOF
  chmod +x "$HOME/.hbuilds-env-refresh.sh"

  pm2 restart hbuilds-env-refresh || pm2 start "$HOME/.hbuilds-env-refresh.sh" --name hbuilds-env-refresh --interpreter bash
  pm2 save
  echo "Seeded hbuilds' .env.local now (best-effort) and (re)started the hbuilds-env-refresh pm2 process, which refreshes it every 2s so it's usually in place before hbuilds' next webhook-triggered build starts (see the caveat above -- this narrows the race, it doesn't close it)."

  # Quick visibility into hbuilds' last independent build result on every
  # deploy, so a regression there shows up without a separate diagnostic run.
  LATEST_LOG=$(find "$HBUILDS/logs" -type f -name "*.log" 2>/dev/null | xargs -r ls -t 2>/dev/null | head -1 || true)
  echo "=== latest hbuilds deploy log: ${LATEST_LOG:-none found} ==="
  if [ -n "${LATEST_LOG:-}" ]; then
    tail -30 "$LATEST_LOG" || true
  fi
  echo "=== end log tail ==="
fi

# DB_HOST / DB_USER / DB_PASSWORD / DB_NAME come from the server's own
# .env.local — they never pass through GitHub Actions or its secrets.
set -a
source .env.local
set +a

BACKUP_FILE=~/theuniqueexpo-backup-$(date +%Y%m%d-%H%M%S).sql
echo "Backing up database to $BACKUP_FILE ..."
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Server has uncommitted local changes — stashing them (recoverable via 'git stash list') before checkout:"
  git status --short
  git stash push -u -m "pre-deploy-autostash-$(date +%s)"
fi

echo "Fetching and checking out $DEPLOY_REF ..."
git fetch origin "$DEPLOY_REF"
git checkout "$DEPLOY_REF"
git pull origin "$DEPLOY_REF"

echo "Applying new migrations ..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/002-expo-registrations.sql
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/003-reset-admin-password.sql
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/004-custom-registration-forms.sql
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/005-about-content.sql
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/006-site-pages.sql

echo "Installing dependencies and building ..."
npm install
# The host can't load Next's native SWC binary (GLIBC mismatch), so it falls
# back to a WASM build using Rust's rayon thread pool, which by default also
# sizes itself off the host's (misreported) CPU count and can hit the same
# process/thread resource limit as experimental.cpus did. Cap it too.
RAYON_NUM_THREADS=2 npm run build

echo "Restarting via PM2 ..."
pm2 restart theuniqueexpo || pm2 start npm --name theuniqueexpo --cwd "$APP_DIR" -- start
pm2 save

echo "Checking the app responds (it may take a few seconds to finish booting) ..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || true)
  if [ -n "$CODE" ] && [ "$CODE" != "000" ]; then
    echo "HTTP $CODE"
    break
  fi
  echo "  not up yet (attempt $i/10), waiting 3s..."
  sleep 3
done

echo "Origin-level check of the new registration routes (bypasses any CDN cache in front of the public domain):"
echo "  /exhibitions/global-ocean-city-food-expo-2026/register -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/exhibitions/global-ocean-city-food-expo-2026/register)"
echo "  /api/expo-registrations/me -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/expo-registrations/me)"

echo "Backup saved at: $BACKUP_FILE (keep this until you've confirmed everything works)"
