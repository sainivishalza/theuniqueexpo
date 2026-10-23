# How to Deploy The Unique Expo on Hostinger

## Prerequisites
- Hostinger plan with Node.js support (Business or higher)
- MySQL database (included in your plan)
- SSH access (enable in Hostinger panel > Advanced > SSH)

## Step 1: Create MySQL Database
1. Go to Hostinger Panel > Databases > MySQL Databases
2. Create a new database: `uXXXXX_theuniqueexpo`
3. Create a database user with full privileges
4. Note down: DB host, DB name, DB user, DB password

## Step 2: Import Schema
1. Go to Hostinger Panel > Databases > phpMyAdmin
2. Select your database
3. Click Import tab
4. Upload `schema.sql` file
5. Click Go to execute

## Step 3: Upload Project
1. Connect via SSH: `ssh uXXXXX@your-server`
2. Navigate to home directory
3. Upload your project files (use File Manager or SCP)
4. Or clone from your Git repo if connected

## Step 4: Install Dependencies
```bash
cd /home/uXXXXX/theuniqueexpo
npm install
```

## Step 5: Configure Environment
Edit `.env.local` with your actual database credentials:
```
DB_HOST=localhost
DB_USER=uXXXXX_theuniqueexpo
DB_PASSWORD=your_actual_password
DB_NAME=uXXXXX_theuniqueexpo
JWT_SECRET=your-random-secret-key
NEXT_PUBLIC_APP_URL=https://www.theuniqueexpo.com
```

## Step 6: Build & Start
```bash
npm run build
npx next start -p 3000
```

## Step 7: Configure Domain
1. Go to Hostinger Panel > Domains > theuniqueexpo.com
2. Set up Node.js app in Hostinger Panel > Advanced > Node.js
3. Point the domain to your Node.js app
4. Enable SSL (free Let's Encrypt)

## Step 8: Keep App Running
Use PM2 to keep the app running:
```bash
npm install -g pm2
pm2 start npm --name "theuniqueexpo" -- start
pm2 save
pm2 startup
```

## Troubleshooting
- If port 3000 is occupied, try `-p 8080`
- Check logs: `pm2 logs theuniqueexpo`
- Restart: `pm2 restart theuniqueexpo`

## Off-site backups

The deploy backups (`~/theuniqueexpo-backup-*.sql`) sit on the same server as the site. The workflow
`.github/workflows/offsite-backup.yml` makes a second copy every night **outside** the server: it dumps the database over SSH,
**encrypts** it (so passport pictures in it cannot be read by anyone who can see the repository), and keeps it as a download on
the workflow run for 14 days. Admin → Health shows when the last one was made.

Set it up once (on your own computer, not on the server):

1. Install [age](https://github.com/FiloSottile/age) (`brew install age`, `apt install age`, or `winget install FiloSottile.age`).
2. Make a key pair: `age-keygen -o theuniqueexpo-backup-key.txt`. It prints `Public key: age1...`.
3. In GitHub → Settings → Secrets and variables → Actions, add a repository secret **`BACKUP_AGE_PUBLIC_KEY`** with the `age1...` public key.
4. Keep `theuniqueexpo-backup-key.txt` (the private key) somewhere safe and **not** on the server or in the repository, for example in a password manager. Without it a backup cannot be opened; with it anyone can read every backup.
5. Run the workflow once by hand (Actions → Off-site backup → Run workflow) and check Admin → Health.

To restore: download the artifact `database-backup-encrypted` from a run, then
`age -d -i theuniqueexpo-backup-key.txt theuniqueexpo-YYYYMMDD-HHMMSS.sql.gz.age | gunzip > backup.sql`, copy `backup.sql` to the
server and use `scripts/restore-backup.sh backup.sql` (it makes a safety copy first and asks for the database name).
