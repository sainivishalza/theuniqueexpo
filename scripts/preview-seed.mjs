// Fills a THROWAWAY database with made-up demo data for a preview copy of the site (see .github/workflows/preview.yml).
// Nothing here is real: every name, e-mail address (@preview.invalid) and company is invented. Safe to run again.
//
//   DB_HOST DB_USER DB_PASSWORD DB_NAME   the database to fill (the same variables the site reads)
//   PREVIEW_PASSWORD                      the password for the demo accounts (a random one is made when it is not set)
//
// Prints one line per demo account so the workflow can show them: "ACCOUNT admin preview-admin@preview.invalid <password>".
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const password = process.env.PREVIEW_PASSWORD || crypto.randomBytes(9).toString("base64url");
const hash = bcrypt.hashSync(password, 10);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "theuniqueexpo",
  charset: process.env.DB_CHARSET || "utf8mb4",
});

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function user(name, email, role, country) {
  const [found] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (found[0]) {
    await pool.query("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?", [hash, found[0].id]);
    return Number(found[0].id);
  }
  const [r] = await pool.query("INSERT INTO users (name, email, password_hash, role, country) VALUES (?, ?, ?, ?, ?)", [name, email, hash, role, country]);
  return Number(r.insertId);
}

async function exhibition(slug, title, startOffset, city, industry) {
  const [found] = await pool.query("SELECT id FROM exhibitions WHERE slug = ?", [slug]);
  if (found[0]) return Number(found[0].id);
  const [r] = await pool.query(
    `INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, organizer, registration_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 'China', ?, ?, 'Preview Organizer', 1)`,
    [slug, title, day(startOffset), day(startOffset + 3), `${city} International Expo Center`, city, industry, `A demo exhibition for ${industry.toLowerCase()} buyers. This text is made up for the preview.`]
  );
  return Number(r.insertId);
}

const adminId = await user("Preview Admin", "preview-admin@preview.invalid", "admin", "China");
await user("Preview Buyer", "preview-buyer@preview.invalid", "buyer", "Kenya");

const expos = [
  await exhibition("preview-canton-demo", "Preview Canton Fair (demo)", 40, "Guangzhou", "General trade"),
  await exhibition("preview-electronics-demo", "Preview Electronics Show (demo)", 75, "Shenzhen", "Electronics"),
  await exhibition("preview-furniture-demo", "Preview Furniture Fair (demo)", 120, "Foshan", "Furniture"),
  await exhibition("preview-textile-demo", "Preview Textile Expo (demo, finished)", -30, "Keqiao", "Textiles"),
];

const countries = ["Kenya", "Nigeria", "Brazil", "Egypt", "Turkey", "Pakistan", "Mexico", "Vietnam"];
const statuses = ["pending", "pending", "approved", "approved", "confirmed", "attended", "rejected", "cancelled"];
for (let i = 0; i < countries.length; i++) {
  const id = await user(`Demo Buyer ${i + 1}`, `demo-buyer-${i + 1}@preview.invalid`, "buyer", countries[i]);
  await pool.query("INSERT IGNORE INTO buyer_profiles (user_id, company_name, nationality) VALUES (?, ?, ?)", [id, `Demo Trading ${i + 1} Ltd`, countries[i]]);
  const expo = expos[i % 3];
  const [has] = await pool.query("SELECT id FROM expo_registrations WHERE user_id = ? AND exhibition_id = ?", [id, expo]);
  if (!has[0]) await pool.query("INSERT INTO expo_registrations (exhibition_id, user_id, status) VALUES (?, ?, ?)", [expo, id, statuses[i]]);
}

console.log(`ACCOUNT admin preview-admin@preview.invalid ${password}`);
console.log(`ACCOUNT buyer preview-buyer@preview.invalid ${password}`);
void adminId;
await pool.end();
