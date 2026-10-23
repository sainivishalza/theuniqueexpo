#!/usr/bin/env bash
# Proves that a database backup, made the way the deploy makes it, can be restored: dump the database, load the dump into a
# scratch database, and compare every table (same tables, same number of rows, same checksum). Nothing in the source
# database is changed. Run it where DB_NAME is a database with data in it (the CI runs it after the end-to-end tests).
#
#   DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD= DB_NAME=unique_expo_ci bash scripts/restore-check.sh
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
SRC="${DB_NAME:?set DB_NAME to the database to check}"
SCRATCH="${SRC}_restore_check"

auth=(-h "$DB_HOST" -u "$DB_USER")
[ -n "$DB_PASSWORD" ] && auth+=("-p$DB_PASSWORD")

# MySQL's own mysqldump asks the server for a table MariaDB does not have, unless told not to; MariaDB's does not know the flag.
extra=()
mysqldump --help 2>/dev/null | grep -q -- '--column-statistics' && extra+=(--column-statistics=0)

dump="$(mktemp)"
cleanup() {
  rm -f "$dump"
  mysql "${auth[@]}" -e "DROP DATABASE IF EXISTS \`$SCRATCH\`" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Backing up $SRC the way the deploy does ..."
mysqldump --default-character-set=utf8mb4 "${extra[@]}" "${auth[@]}" "$SRC" > "$dump"
size=$(wc -c < "$dump")
# A backup that stopped half way (disk full, lost connection) has no closing line: that is not a backup.
if ! tail -n 5 "$dump" | grep -q -- '-- Dump completed'; then echo "FAIL: the backup is incomplete (no closing line)."; exit 1; fi
echo "Backup: $size bytes."

echo "Restoring it into $SCRATCH ..."
mysql "${auth[@]}" -e "DROP DATABASE IF EXISTS \`$SCRATCH\`; CREATE DATABASE \`$SCRATCH\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql --default-character-set=utf8mb4 "${auth[@]}" "$SCRATCH" < "$dump"

tables() { mysql "${auth[@]}" -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema = '$1' AND table_type = 'BASE TABLE' ORDER BY table_name"; }
src_tables="$(tables "$SRC")"
if [ "$src_tables" != "$(tables "$SCRATCH")" ]; then echo "FAIL: the restored database has different tables."; diff <(echo "$src_tables") <(tables "$SCRATCH") || true; exit 1; fi

count=0; rows=0; bad=0
while read -r t; do
  [ -z "$t" ] && continue
  a=$(mysql "${auth[@]}" -N -e "SELECT COUNT(*) FROM \`$SRC\`.\`$t\`")
  b=$(mysql "${auth[@]}" -N -e "SELECT COUNT(*) FROM \`$SCRATCH\`.\`$t\`")
  ca=$(mysql "${auth[@]}" -N -e "CHECKSUM TABLE \`$SRC\`.\`$t\`" | awk '{print $2}')
  cb=$(mysql "${auth[@]}" -N -e "CHECKSUM TABLE \`$SCRATCH\`.\`$t\`" | awk '{print $2}')
  if [ "$a" != "$b" ] || [ "$ca" != "$cb" ]; then echo "FAIL: table $t differs (rows $a vs $b, checksum $ca vs $cb)."; bad=$((bad + 1)); fi
  count=$((count + 1)); rows=$((rows + a))
done <<< "$src_tables"

if [ "$bad" -ne 0 ]; then echo "FAIL: $bad of $count tables differ after the restore."; exit 1; fi
if [ "$count" -lt 10 ] || [ "$rows" -lt 1 ]; then echo "FAIL: only $count tables and $rows rows: this does not look like a real database."; exit 1; fi
echo "OK: $count tables and $rows rows restored identically."
