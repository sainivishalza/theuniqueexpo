import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray } from "@/lib/server/db-helpers";

function mapTourAppRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    tourId: row.tour_id,
    userId: String(row.user_id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    nationality: row.nationality,
    travelers: row.travelers,
    services: safeParseArray(row.services),
    specialRequests: row.special_requests,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listTourApplications() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM tour_applications ORDER BY created_at DESC");
  return rows.map(mapTourAppRow);
}

export async function createTourApplication(input: {
  tourId: string; userId: number; name: string; email: string; phone: string;
  company: string; nationality: string; travelers: number; services: string[]; specialRequests: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tour_applications (tour_id, user_id, name, email, phone, company, nationality, travelers, services, special_requests, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.tourId, input.userId, input.name, input.email, input.phone, input.company, input.nationality, input.travelers, JSON.stringify(input.services || []), input.specialRequests]
  );
  return result.insertId;
}

export async function updateTourApplicationStatus(id: number, status: string) {
  await pool.query("UPDATE tour_applications SET status = ? WHERE id = ?", [status, id]);
}

function mapVisaAppRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    serviceId: row.service_id,
    userId: String(row.user_id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    nationality: row.nationality,
    serviceType: row.service_type,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listVisaApplications() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM visa_applications ORDER BY created_at DESC");
  return rows.map(mapVisaAppRow);
}

export async function createVisaApplication(input: {
  serviceId: string; userId: number; name: string; email: string; phone: string;
  company: string; nationality: string; serviceType: string; details: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO visa_applications (service_id, user_id, name, email, phone, company, nationality, service_type, details, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.serviceId, input.userId, input.name, input.email, input.phone, input.company, input.nationality, input.serviceType, input.details]
  );
  return result.insertId;
}

export async function updateVisaApplicationStatus(id: number, status: string) {
  await pool.query("UPDATE visa_applications SET status = ? WHERE id = ?", [status, id]);
}

function mapConsultationRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : "",
    name: row.name,
    email: row.email,
    company: row.company,
    topic: row.topic,
    preferredDate: row.preferred_date,
    questions: row.questions,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listConsultationBookings() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM consultation_bookings ORDER BY created_at DESC");
  return rows.map(mapConsultationRow);
}

export async function createConsultationBooking(input: {
  userId?: number; name: string; email: string; company: string; topic: string; preferredDate: string; questions: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO consultation_bookings (user_id, name, email, company, topic, preferred_date, questions, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.userId || null, input.name, input.email, input.company, input.topic, input.preferredDate || null, input.questions]
  );
  return result.insertId;
}

export async function updateConsultationStatus(id: number, status: string) {
  await pool.query("UPDATE consultation_bookings SET status = ? WHERE id = ?", [status, id]);
}
