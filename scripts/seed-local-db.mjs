// One-off local dev seeder: copies static demo data (exhibitions, hotels, RFQs)
// into the local MySQL database so admin edits have something real to act on.
// Safe to re-run — skips rows that already exist by slug/name.
import mysql from "mysql2/promise";
import { exhibitions } from "../src/lib/exhibitions.ts";
import { getAllHotels } from "../src/lib/hotels.ts";
import { getRFQs, getQuotesForRFQ } from "../src/lib/rfq.ts";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "theuniqueexpo",
  charset: process.env.DB_CHARSET || "utf8mb4",
});

const slugToDbId = new Map();

async function seedExhibitions() {
  for (const e of exhibitions) {
    const [existing] = await pool.query("SELECT id FROM exhibitions WHERE slug = ?", [e.slug]);
    if (existing.length > 0) {
      slugToDbId.set(e.slug, existing[0].id);
      continue;
    }
    const [result] = await pool.query(
      `INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights, exhibitors, visitors, organizer, website, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.slug, e.title, e.startDate, e.endDate, e.venue, e.city, e.country, e.industry, e.description, JSON.stringify(e.highlights), e.exhibitors, e.visitors, e.organizer, e.website, e.color]
    );
    slugToDbId.set(e.slug, result.insertId);
  }
  console.log(`Seeded ${slugToDbId.size} exhibitions`);
}

const oldIdToSlug = new Map(exhibitions.map((e) => [e.id, e.slug]));

async function seedHotels() {
  const hotels = getAllHotels();
  let count = 0;
  for (const h of hotels) {
    const [existing] = await pool.query("SELECT id FROM hotels WHERE name = ? AND city = ?", [h.name, h.city]);
    if (existing.length > 0) continue;
    const exhibitionSlug = oldIdToSlug.get(h.exhibitionId);
    const exhibitionDbId = exhibitionSlug ? slugToDbId.get(exhibitionSlug) : null;
    await pool.query(
      `INSERT INTO hotels (name, stars, address, city, exhibition_id, price_per_night, distance_to_venue, amenities, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [h.name, h.stars, h.address, h.city, exhibitionDbId || null, h.pricePerNight, h.distanceToVenue, JSON.stringify(h.amenities), h.image]
    );
    count++;
  }
  console.log(`Seeded ${count} hotels`);
}

async function seedRfqs() {
  const rfqs = getRFQs();
  let count = 0;
  for (const r of rfqs) {
    const [existing] = await pool.query("SELECT id FROM rfqs WHERE title = ? AND buyer_name = ?", [r.title, r.buyerName]);
    if (existing.length > 0) continue;
    const [result] = await pool.query(
      `INSERT INTO rfqs (title, product, description, quantity, target_price, deadline, category, buyer_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.title, r.product, r.description, r.quantity, r.targetPrice, r.deadline, r.category, r.buyerName, r.status, r.createdAt]
    );
    const quotes = getQuotesForRFQ(r.id);
    for (const q of quotes) {
      await pool.query(
        `INSERT INTO quotes (rfq_id, exhibitor_name, price, lead_time, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, q.exhibitorName, q.price, q.leadTime, q.notes, q.status, q.createdAt]
      );
    }
    count++;
  }
  console.log(`Seeded ${count} RFQs`);
}

await seedExhibitions();
await seedHotels();
await seedRfqs();
await pool.end();
console.log("Done.");
