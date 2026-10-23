#!/usr/bin/env bash
# Puts a database backup (one of ~/theuniqueexpo-backup-*.sql, made by every deploy) back into the site's database.
# The backup replaces the tables it contains; a safety copy of the current database is made first.
#
#   RESTORE_CONFIRM=<database name> bash scripts/restore-backup.sh ~/theuniqueexpo-backup-20260101-120000.sql
#
# Without RESTORE_CONFIRM set to the database's name it only says what it would do. The connection comes from .env.local
# (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) unless those are already set. scripts/restore-check.sh proves in CI that a
# backup made this way restores completely.
set -euo pipefail

file="${1:-}"
[ -n "$file" ] && [ -r "$file" ] || { echo "Usage: RESTORE_CONFIRM=<database name> bash scripts/restore-backup.sh <backup.sql>"; exit 2; }

if [ -z "${DB_NAME:-}" ] && [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi
: "${DB_NAME:?DB_NAME is not set (and there is no .env.local here)}"
DB_HOST="${DB_HOST:-127.0.0.1}"; DB_USER="${DB_USER:-root}"; DB_PASSWORD="${DB_PASSWORD:-}"
auth=(-h "$DB_HOST" -u "$DB_USER")
[ -n "$DB_PASSWORD" ] && auth+=("-p$DB_PASSWORD")

# The same closing-line check the deploy makes: an incomplete file would leave the database half restored.
if ! tail -n 5 "$file" | grep -q -- '-- Dump completed'; then echo "REFUSED: $file is incomplete (no closing line), so it cannot be restored safely."; exit 1; fi

echo "Backup:   $file ($(wc -c < "$file") bytes)"
echo "Database: $DB_NAME on $DB_HOST"
if [ "${RESTORE_CONFIRM:-}" != "$DB_NAME" ]; then
  echo "Nothing was changed. To restore, run again with RESTORE_CONFIRM=$DB_NAME"
  exit 0
fi

safety="$(dirname "$file")/theuniqueexpo-before-restore-$(date +%Y%m%d-%H%M%S).sql"
echo "Saving the current database to $safety first ..."
extra=()
mysqldump --help 2>/dev/null | grep -q -- '--column-statistics' && extra+=(--column-statistics=0)
mysqldump --default-character-set=utf8mb4 "${extra[@]}" "${auth[@]}" "$DB_NAME" > "$safety"
tail -n 5 "$safety" | grep -q -- '-- Dump completed' || { echo "The safety copy is incomplete: stopping, nothing was restored."; exit 1; }

echo "Restoring ..."
mysql --default-character-set=utf8mb4 "${auth[@]}" "$DB_NAME" < "$file"
echo "Done. The database was restored from $file (the copy it replaced is $safety)."
