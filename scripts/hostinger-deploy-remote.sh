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

# DB_HOST / DB_USER / DB_PASSWORD / DB_NAME come from the server's own
# .env.local — they never pass through GitHub Actions or its secrets.
set -a
source .env.local
set +a

BACKUP_FILE=~/theuniqueexpo-backup-$(date +%Y%m%d-%H%M%S).sql
echo "Backing up database to $BACKUP_FILE ..."
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"

echo "Fetching and checking out $DEPLOY_REF ..."
git fetch origin "$DEPLOY_REF"
git checkout "$DEPLOY_REF"
git pull origin "$DEPLOY_REF"

echo "Applying new migrations ..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/002-expo-registrations.sql
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema-migrations/003-reset-admin-password.sql

echo "Installing dependencies and building ..."
npm install
npm run build

echo "Restarting via PM2 ..."
pm2 restart theuniqueexpo || pm2 start npm --name theuniqueexpo --cwd "$APP_DIR" -- start
pm2 save

echo "Checking the app responds ..."
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000/

echo "Backup saved at: $BACKUP_FILE (keep this until you've confirmed everything works)"
