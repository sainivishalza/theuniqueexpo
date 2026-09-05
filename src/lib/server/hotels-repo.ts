import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray, toDateOnlyString } from "@/lib/server/db-helpers";

function mapHotelRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    name: row.name,
    stars: row.stars,
    address: row.address,
    city: row.city,
    exhibitionId: row.exhibition_id ? String(row.exhibition_id) : "",
    pricePerNight: Number(row.price_per_night),
    distanceToVenue: row.distance_to_venue,
    amenities: safeParseArray(row.amenities),
    image: row.image,
  };
}

function mapBookingRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    hotelId: String(row.hotel_id),
    hotelName: row.hotel_name,
    exhibitionId: row.exhibition_id ? String(row.exhibition_id) : "",
    userId: row.user_id ? String(row.user_id) : "",
    userName: row.user_name,
    checkIn: toDateOnlyString(row.check_in),
    checkOut: toDateOnlyString(row.check_out),
    rooms: row.rooms,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listHotels(exhibitionId?: number) {
  if (exhibitionId) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM hotels WHERE exhibition_id = ? ORDER BY name ASC", [exhibitionId]);
    return rows.map(mapHotelRow);
  }
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM hotels ORDER BY name ASC");
  return rows.map(mapHotelRow);
}

export async function createHotel(input: {
  name: string; stars: number; address: string; city: string; exhibitionId?: number;
  pricePerNight: number; distanceToVenue: string; amenities: string[]; image?: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO hotels (name, stars, address, city, exhibition_id, price_per_night, distance_to_venue, amenities, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.name, input.stars, input.address, input.city, input.exhibitionId || null, input.pricePerNight, input.distanceToVenue, JSON.stringify(input.amenities || []), input.image || "🏨"]
  );
  return result.insertId;
}

export async function updateHotel(id: number, input: {
  name: string; stars: number; address: string; city: string; exhibitionId?: number;
  pricePerNight: number; distanceToVenue: string; amenities: string[]; image?: string;
}) {
  await pool.query(
    `UPDATE hotels SET name=?, stars=?, address=?, city=?, exhibition_id=?, price_per_night=?, distance_to_venue=?, amenities=?, image=? WHERE id=?`,
    [input.name, input.stars, input.address, input.city, input.exhibitionId || null, input.pricePerNight, input.distanceToVenue, JSON.stringify(input.amenities || []), input.image || "🏨", id]
  );
}

export async function deleteHotel(id: number) {
  await pool.query("DELETE FROM hotels WHERE id = ?", [id]);
}

export async function listHotelBookings() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT hb.*, h.name AS hotel_name FROM hotel_bookings hb JOIN hotels h ON hb.hotel_id = h.id ORDER BY hb.created_at DESC`
  );
  return rows.map(mapBookingRow);
}

export async function createHotelBooking(input: {
  hotelId: number; exhibitionId?: number; userId?: number; userName: string;
  checkIn: string; checkOut: string; rooms: number;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO hotel_bookings (hotel_id, exhibition_id, user_id, user_name, check_in, check_out, rooms, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.hotelId, input.exhibitionId || null, input.userId || null, input.userName, input.checkIn, input.checkOut, input.rooms]
  );
  return result.insertId;
}

export async function updateHotelBookingStatus(id: number, status: string) {
  await pool.query("UPDATE hotel_bookings SET status = ? WHERE id = ?", [status, id]);
}
