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
