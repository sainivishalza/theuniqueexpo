#!/bin/bash
# Runs ON the Hostinger server (piped in as stdin over SSH by
# .github/workflows/deploy-hostinger.yml). Not meant to be run standalone
# without the two positional args below.
#
# $1 = app directory on the server (e.g. /home/u428186913/theuniqueexpo)
# $2 = git branch/ref to deploy
set -euo pipefail

APP_DIR="$1"
DEPLOY_REF="$2"

cd "$APP_DIR"

# Hostinger's real production serving mechanism is Passenger/hbuilds, which
# builds from `main` on its own (webhook-driven) independently of this
# script's own SSH-driven build+PM2 restart below. Diagnostics found that
# hbuilds' build kept failing (and so kept leaving the live site on an old,
# stale build) once pages started needing DB access at build time for ISR:
# hbuilds' checkout at hbuilds/source/repository has no .env.local of its
# own, so Next.js falls back to default DB creds and every prerender of a
# DB-backed page fails with ER_ACCESS_DENIED_ERROR. Copy this app's own
# .env.local over so hbuilds' independent build can reach the database too.
HBUILDS=~/domains/theuniqueexpo.com/hbuilds
if [ -f "$APP_DIR/.env.local" ] && [ -d "$HBUILDS/source/repository" ]; then
  cp "$APP_DIR/.env.local" "$HBUILDS/source/repository/.env.local"
  echo "Copied .env.local into hbuilds' own build checkout."
fi

# A non-interactive SSH command doesn't source .bashrc/.profile, so
# nvm-installed node/npm/pm2 aren't on PATH by default — load nvm explicitly.
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm still not found after loading nvm. Is Node installed another way (not nvm)?" >&2
  exit 1
fi

# DB_HOST / DB_USER / DB_PASSWORD / DB_NAME come from the server's own
# .env.local — they never pass through GitHub Actions or its secrets.
set -a
source .env.local
set +a

echo "=== DIAGNOSTIC: DB connectivity by host variant (DB_HOST is currently '$DB_HOST') ==="
for h in "$DB_HOST" 127.0.0.1 ::1 localhost; do
  if mysql -h "$h" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; then
    echo "  $h -> OK"
  else
    echo "  $h -> FAILED"
  fi
done
echo "=== END DIAGNOSTIC ==="

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
