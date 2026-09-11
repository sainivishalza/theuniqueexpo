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

# A non-interactive SSH command doesn't source .bashrc/.profile, so
# nvm-installed node/npm/pm2 aren't on PATH by default — load nvm explicitly.
# Needed early: pm2 is used below (hbuilds cleanup, then the app restart).
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm still not found after loading nvm. Is Node installed another way (not nvm)?" >&2
  exit 1
fi

# Diagnostics up front, before anything else touches the DB or rebuilds --
# the last few deploys broke in different ways (runtime 500s after a clean
# build, then the build itself aborting/core-dumping) even though the app
# source was unchanged between some of those attempts, pointing at host
# resource pressure rather than a code bug. Capture the currently-running
# process's state and the currently-running app's own error log (from
# whatever the *previous* deploy left running) before this run does
# anything that could itself add more pressure.
echo "--- host memory ---"
free -h 2>&1 || true
echo "--- disk space ---"
df -h "$HOME" 2>&1 || true
echo "--- pm2 process list ---"
pm2 list 2>&1 || true
echo "--- currently-running app's pm2 error log tail ---"
PM2_ERR_LOG=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const a=JSON.parse(d);const p=a.find(x=>x.name==='theuniqueexpo');console.log(p&&p.pm2_env&&p.pm2_env.pm_err_log_path||'');}catch(e){console.log('');}})" 2>/dev/null || true)
if [ -n "$PM2_ERR_LOG" ] && [ -f "$PM2_ERR_LOG" ]; then
  tail -n 100 "$PM2_ERR_LOG" 2>&1 || true
else
  echo "(could not resolve pm2 error log path; falling back to default location)"
  tail -n 100 ~/.pm2/logs/theuniqueexpo-error.log 2>&1 || true
fi

# Hostinger's real production serving mechanism is Passenger/hbuilds, which
# builds from `main` on its own (webhook-driven) independently of this
# script's own SSH-driven build+PM2 restart below.
#
# hbuilds' checkout at hbuilds/source/repository has no persistent .git --
# it's rebuilt from scratch on every build -- so it used to have no
# .env.local either, and every prerender of a DB-backed page failed with
# ER_ACCESS_DENIED_ERROR. This was previously "fixed" with a pm2-managed
# loop that re-copied .env.local into hbuilds' checkout every 2 seconds,
# which narrowed the race but could never close it (hbuilds could wipe the
# directory at literally any instant, including mid-build).
#
# Properly fixed now: DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_SOCKET/
# JWT_SECRET are set as persistent Node.js environment variables directly
# in hPanel (Websites -> theuniqueexpo.com -> Node.js app -> Environment
# variables), which survive every checkout wipe since they're not a file
# under source/repository at all. Confirmed working (DB-backed pages and
# login both succeed on the live site). The old refresher pm2 process is
# stopped below as one-time cleanup -- this line is itself safe to remove
# once it's run against every server that ever had it.
pm2 delete hbuilds-env-refresh 2>/dev/null || true
HBUILDS=~/domains/theuniqueexpo.com/hbuilds
if [ -f "$APP_DIR/.env.local" ]; then
  # hbuilds' actual serving workers (Passenger-managed next-server processes)
  # can live for a long time across many rebuilds without a full restart --
  # a build-time-only DB pool created once and never recycled can end up
  # with stale/exhausted MySQL connections (or the env value it captured
  # before an hPanel edit), causing exactly the kind of runtime-only 500 we
  # saw on /api/exhibitions even though the process's env vars are present
  # and correct. Ask Passenger for a graceful restart on every deploy via
  # its own documented mechanism (touching tmp/restart.txt in the app root)
  # so those workers always start fresh, rather than sending signals to
  # processes directly.
  # Diagnostics showed the actual serving process's cwd is
  # hbuilds/current/nodejs (a subdirectory of the version root), not the
  # version root itself. touch-ing tmp/restart.txt at both candidate app
  # roots didn't actually cause a restart (production kept serving stale
  # responses across several redeploys), so Passenger here doesn't seem to
  # be watching that convention. Use its own CLI restart command instead --
  # the same kind of sanctioned "restart this managed app" operation as the
  # pm2 restart already used above, just for the Passenger-managed side.
  if command -v passenger-config >/dev/null 2>&1; then
    passenger-config restart-app "$HBUILDS/current/nodejs" 2>&1 || true
    passenger-config restart-app "$HBUILDS/current" 2>&1 || true
    echo "Requested a Passenger app restart via passenger-config for both candidate app roots."
  else
    echo "(passenger-config not found on PATH -- falling back to touching tmp/restart.txt, which may not be honored here)"
    mkdir -p "$HBUILDS/current/nodejs/tmp" "$HBUILDS/current/tmp" 2>/dev/null || true
    touch "$HBUILDS/current/nodejs/tmp/restart.txt" "$HBUILDS/current/tmp/restart.txt" 2>/dev/null || true
  fi
fi

# DB_HOST / DB_USER / DB_PASSWORD / DB_NAME come from the server's own
# .env.local — they never pass through GitHub Actions or its secrets.
set -a
source .env.local
set +a

# Without an explicit client charset, the mysql CLI here defaults to
# latin1 -- multi-byte UTF-8 content (em dashes, curly quotes, non-Latin
# text) in a migration's INSERT statements gets mangled into mojibake on
# the way in, even though the tables themselves are utf8mb4. Applies to
# mysqldump too, so a restored backup doesn't inherit the same corruption.
MYSQL="mysql --default-character-set=utf8mb4 -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME"

BACKUP_FILE=~/theuniqueexpo-backup-$(date +%Y%m%d-%H%M%S).sql
echo "Backing up database to $BACKUP_FILE ..."
mysqldump --default-character-set=utf8mb4 -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
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

# The last three deploys all failed with "Can't connect to local server
# through socket '/var/lib/mysql/mysql.sock'" at various points right
# after mysqldump above -- including once immediately after a successful
# `SELECT 1` reachability check, on the very next mysql invocation. That
# rules out a single up-front readiness check (a one-time "is the DB up"
# probe can't catch a failure on a *later*, separate connection attempt)
# and points to a narrow per-connection race on this shared host rather
# than a single sustained outage. Retry each migration's own connection
# attempt individually instead.
run_mysql() {
  local file="$1"
  for i in 1 2 3 4 5; do
    if $MYSQL < "$file"; then
      return 0
    fi
    echo "  mysql failed applying $file (attempt $i/5), waiting 3s..." >&2
    sleep 3
  done
  echo "Giving up on $file after 5 attempts." >&2
  return 1
}

echo "Applying new migrations ..."
run_mysql schema-migrations/002-expo-registrations.sql
run_mysql schema-migrations/004-custom-registration-forms.sql
run_mysql schema-migrations/005-about-content.sql
run_mysql schema-migrations/006-site-pages.sql
run_mysql schema-migrations/007-fix-malformed-slugs.sql
run_mysql schema-migrations/008-exhibition-gallery-images.sql
run_mysql schema-migrations/009-fix-poster-content.sql
run_mysql schema-migrations/010-exhibitions-updated-at.sql
run_mysql schema-migrations/011-messaging-favorites-reviews.sql
run_mysql schema-migrations/012-tours.sql
run_mysql schema-migrations/013-exhibition-tour-i18n-content.sql
run_mysql schema-migrations/014-events-blog-tour-reviews.sql
run_mysql schema-migrations/015-moving-subsidy-applications.sql
run_mysql schema-migrations/016-company-profile.sql
run_mysql schema-migrations/017-blog-author.sql
run_mysql schema-migrations/018-blog-pillar-cluster-content.sql
run_mysql schema-migrations/019-faq-content.sql
run_mysql schema-migrations/020-site-theme.sql
run_mysql schema-migrations/021-rotate-admin-password.sql
run_mysql schema-migrations/022-team-members.sql
run_mysql schema-migrations/023-partner-program.sql
run_mysql schema-migrations/024-magazine-video-conference-city.sql
run_mysql schema-migrations/025-conference-city-content.sql

echo "Installing dependencies and building ..."
npm install
# Next's incremental type-checking cache under .next/dev/types is not fully
# invalidated by a route restructure (e.g. moving pages under a new
# directory segment) -- it can keep referencing page paths that no longer
# exist, failing the build's typecheck step with false "Cannot find module"
# errors even though `tsc --noEmit` passes cleanly against the real source.
# A stale .next from a previous deploy is never valid to keep; always
# rebuild it from scratch.
rm -rf .next
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
echo "  /api/exhibitions -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/exhibitions)"
echo "  --- direct DB check: exhibitions row count ---"
$MYSQL -e "SELECT COUNT(*) AS exhibitions_count FROM exhibitions;" 2>&1

echo "--- pm2 error log tail (diagnosing a 500 above, if any) ---"
# `pm2 logs --nostream` still attaches to the log bus over a non-interactive
# SSH session on this host and never returns, hanging the whole deploy step
# until the workflow times it out. Read the underlying log file directly
# instead -- pm2's default location, non-interactive-safe.
PM2_ERR_LOG=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const a=JSON.parse(d);const p=a.find(x=>x.name==='theuniqueexpo');console.log(p&&p.pm2_env&&p.pm2_env.pm_err_log_path||'');}catch(e){console.log('');}})" 2>/dev/null || true)
if [ -n "$PM2_ERR_LOG" ] && [ -f "$PM2_ERR_LOG" ]; then
  tail -n 150 "$PM2_ERR_LOG"
else
  echo "(could not resolve pm2 error log path; falling back to default location)"
  tail -n 150 ~/.pm2/logs/theuniqueexpo-error.log 2>&1 || true
fi

echo "Backup saved at: $BACKUP_FILE (keep this until you've confirmed everything works)"
