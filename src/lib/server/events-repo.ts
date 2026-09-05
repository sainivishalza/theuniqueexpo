import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toDateOnlyString } from "@/lib/server/db-helpers";

export type EventCategory = "networking" | "hiking" | "picnic" | "cultural" | "other";

export interface EventInput {
  slug: string;
  title: string;
  category: EventCategory;
  city: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  price: string;
  capacity: number;
  description: string;
  image?: string;
}

function mapEventRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    category: row.category as EventCategory,
    city: row.city,
    venue: row.venue,
    eventDate: toDateOnlyString(row.event_date),
    startTime: row.start_time,
    endTime: row.end_time,
    price: row.price,
    capacity: row.capacity,
    description: row.description,
    image: row.image,
    registrationEnabled: row.registration_enabled === undefined ? true : !!row.registration_enabled,
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

export async function listEvents(view?: "upcoming" | "past") {
  const where = view === "past" ? "WHERE event_date < CURDATE()" : view === "upcoming" ? "WHERE event_date >= CURDATE()" : "";
  const order = view === "past" ? "DESC" : "ASC";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM events ${where} ORDER BY event_date ${order}`
  );
  return rows.map(mapEventRow);
}

export async function getEventBySlugOrId(slugOrId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM events WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  return row ? mapEventRow(row) : null;
}

export async function createEvent(input: EventInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO events (slug, title, category, city, venue, event_date, start_time, end_time, price, capacity, description, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.category, input.city, input.venue, input.eventDate,
      input.startTime, input.endTime, input.price, input.capacity, input.description, input.image || "",
    ]
  );
  return result.insertId;
}

export async function updateEvent(id: number, input: EventInput) {
  await pool.query(
    `UPDATE events SET slug=?, title=?, category=?, city=?, venue=?, event_date=?, start_time=?, end_time=?, price=?, capacity=?, description=?, image=?
     WHERE id=?`,
    [
      input.slug, input.title, input.category, input.city, input.venue, input.eventDate,
      input.startTime, input.endTime, input.price, input.capacity, input.description, input.image || "", id,
    ]
  );
}

export async function deleteEvent(id: number) {
  await pool.query("DELETE FROM events WHERE id = ?", [id]);
}

export async function updateEventRegistrationConfig(id: number, registrationEnabled: boolean) {
  await pool.query("UPDATE events SET registration_enabled = ? WHERE id = ?", [registrationEnabled, id]);
}

function mapRegistrationRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userId: String(row.user_id),
    userName: row.user_name,
    userEmail: row.user_email,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createEventRegistration(userId: number, eventId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO event_registrations (event_id, user_id, status) VALUES (?, ?, 'pending')",
    [eventId, userId]
  );
  return result.insertId;
}

export async function findExistingEventRegistration(eventId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1",
    [eventId, userId]
  );
  return rows[0] || null;
}

export async function listRegistrationsForEvent(eventId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT er.*, u.name AS user_name, u.email AS user_email
     FROM event_registrations er JOIN users u ON u.id = er.user_id
     WHERE er.event_id = ? ORDER BY er.created_at DESC`,
    [eventId]
  );
  return rows.map(mapRegistrationRow);
}

export async function updateEventRegistrationStatus(id: number, status: string) {
  await pool.query("UPDATE event_registrations SET status = ? WHERE id = ?", [status, id]);
}
