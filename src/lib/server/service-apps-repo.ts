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

function mapMovingQuoteRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : "",
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    movingType: row.moving_type,
    originCity: row.origin_city,
    destinationCity: row.destination_city,
    preferredDate: row.preferred_date,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listMovingQuotes() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM moving_quotes ORDER BY created_at DESC");
  return rows.map(mapMovingQuoteRow);
}

export async function createMovingQuote(input: {
  userId?: number; name: string; email: string; phone: string; company: string;
  movingType: string; originCity: string; destinationCity: string; preferredDate: string; details: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO moving_quotes (user_id, name, email, phone, company, moving_type, origin_city, destination_city, preferred_date, details, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.userId || null, input.name, input.email, input.phone || "", input.company || "", input.movingType, input.originCity, input.destinationCity, input.preferredDate || null, input.details || ""]
  );
  return result.insertId;
}

export async function updateMovingQuoteStatus(id: number, status: string) {
  await pool.query("UPDATE moving_quotes SET status = ? WHERE id = ?", [status, id]);
}

function mapSubsidyApplicationRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : "",
    subsidyId: row.subsidy_id,
    name: row.name,
    email: row.email,
    company: row.company,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listSubsidyApplications() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM subsidy_applications ORDER BY created_at DESC");
  return rows.map(mapSubsidyApplicationRow);
}

export async function createSubsidyApplication(input: {
  userId?: number; subsidyId: string; name: string; email: string; company: string; message: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO subsidy_applications (user_id, subsidy_id, name, email, company, message, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [input.userId || null, input.subsidyId, input.name, input.email, input.company || "", input.message || ""]
  );
  return result.insertId;
}

export async function updateSubsidyApplicationStatus(id: number, status: string) {
  await pool.query("UPDATE subsidy_applications SET status = ? WHERE id = ?", [status, id]);
}
