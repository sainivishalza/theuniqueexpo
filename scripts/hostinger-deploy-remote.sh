#!/bin/bash
# Runs ON the Hostinger server (piped in as stdin over SSH by
# .github/workflows/deploy-hostinger.yml). Not meant to be run standalone
# without the two positional args below.
#
# $1 = app directory on the server (e.g. /home/u428186913/theuniqueexpo)
# $2 = git branch/ref to deploy
#
# WHAT THIS DOES -- AND DELIBERATELY DOES NOT DO
# The live site is built and served by Hostinger itself from the `main`
# branch (hPanel -> Websites -> theuniqueexpo.com -> Node.js -> Deployments).
# This script used to ALSO run its own `npm install` + `next build` + a PM2
# copy of the app on port 3000. That copy never served production (port 3000
# was always already taken: EADDRINUSE), but the extra build competed with
# Hostinger's own build for this shared account's CPU and process quota, it
# `pkill`-ed any "next build" on the account (including Hostinger's own), and
# on 2026-10-11 the live site stopped answering for ~25 minutes while both
# were running. So now this job only does what Hostinger's build cannot:
# back up the database and apply the SQL migrations in schema-migrations/.
# Application code reaches production through Hostinger's own build.
set -euo pipefail

APP_DIR="$1"
DEPLOY_REF="$2"

cd "$APP_DIR"

echo "--- disk space ---"
df -h "$HOME" 2>&1 || true

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
run_mysql schema-migrations/026-photo-organizer.sql
run_mysql schema-migrations/027-user-management.sql
run_mysql schema-migrations/028-partner-referrals.sql
run_mysql schema-migrations/029-merge-visitor-into-buyer-role.sql
run_mysql schema-migrations/030-buyer-profiles.sql
run_mysql schema-migrations/031-import-canton-fair-buyers.sql
run_mysql schema-migrations/032-buyer-profile-registration-code.sql
run_mysql schema-migrations/033-backfill-buyer-registration-codes.sql
run_mysql schema-migrations/034-buyer-document-verification.sql
run_mysql schema-migrations/035-homepage-slideshow.sql
run_mysql schema-migrations/036-buyer-profile-more-fields.sql
run_mysql schema-migrations/037-buyer-pending-documents.sql
run_mysql schema-migrations/038-import-cphi-shenzhen-buyers.sql
run_mysql schema-migrations/039-buyer-profile-visa-fields.sql
run_mysql schema-migrations/040-buyer-source-exhibitions.sql
run_mysql schema-migrations/041-backfill-cphi-source-exhibition.sql
run_mysql schema-migrations/042-buyer-invoice-order-list-document.sql
run_mysql schema-migrations/043-auto-verify-existing-documents.sql
run_mysql schema-migrations/044-business-partner-inquiries.sql
run_mysql schema-migrations/045-business-trip-form-and-partner-form.sql
run_mysql schema-migrations/046-china-travel-content.sql
run_mysql schema-migrations/047-buyer-profile-phone-number.sql
run_mysql schema-migrations/049-newsletter-subscribers.sql
run_mysql schema-migrations/050-remove-placeholder-site-content.sql
run_mysql schema-migrations/051-buyer-expos.sql
run_mysql schema-migrations/052-winb-exhibitions.sql
run_mysql schema-migrations/053-expo-registration-lifecycle.sql
run_mysql schema-migrations/054-buyer-numbers.sql
run_mysql schema-migrations/055-buyer-document-flags.sql
run_mysql schema-migrations/056-wallet.sql
run_mysql schema-migrations/057-exhibition-point-tiers.sql
run_mysql schema-migrations/058-buyer-latest-entry-stamp-document.sql
run_mysql schema-migrations/059-buyer-form-settings.sql
run_mysql schema-migrations/060-rate-limits.sql
run_mysql schema-migrations/061-email.sql
run_mysql schema-migrations/062-email-changes-reminders.sql

# Every deploy saves a full copy of the database (uploaded documents included) and
# nothing ever removed them, so they would slowly fill this account's disk. Keep the
# newest few, delete the rest. This sits after the migrations on purpose: if a
# migration fails, set -e has already stopped the job and every backup is still here.
# Never fails the job (a cleanup problem must not look like a failed deploy).
KEEP_BACKUPS=5
ls -1t ~/theuniqueexpo-backup-*.sql 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | while read -r old_backup; do
  rm -f -- "$old_backup" && echo "Removed old backup: $old_backup"
done || true
echo "Backups kept (newest $KEEP_BACKUPS):"
ls -lh ~/theuniqueexpo-backup-*.sql 2>/dev/null || true

echo
echo "Database backup and migrations finished."
echo "This job does not build or restart the site: Hostinger builds and serves it from main."
echo "Check the build status in hPanel -> Websites -> theuniqueexpo.com -> Node.js -> Deployments."

# Informational only (never fails the job): what the public site answers
# right now. A new build can take several minutes to go live after a merge.
echo "Public site check: https://theuniqueexpo.com/en -> HTTP $(curl -s -o /dev/null -m 20 -w '%{http_code}' https://theuniqueexpo.com/en || true)"
echo "Backup saved at: $BACKUP_FILE (keep this until you've confirmed everything works)"
