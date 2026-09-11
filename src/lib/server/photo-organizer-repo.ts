import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export type BatchStatus = "uploading" | "processing" | "review" | "finalizing" | "done" | "failed";
export type DetectionStatus = "detected" | "low_confidence" | "not_found";

export interface PhotoOrganizerBatch {
  id: number;
  originalFilename: string;
  status: BatchStatus;
  errorMessage: string | null;
  totalFiles: number;
  totalGroups: number;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoOrganizerGroup {
  id: number;
  batchId: number;
  groupKey: string;
  detectedName: string | null;
  confirmedName: string | null;
  passportFilename: string | null;
  fileList: string[];
  detectionStatus: DetectionStatus;
}

function mapBatchRow(row: RowDataPacket): PhotoOrganizerBatch {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    status: row.status,
    errorMessage: row.error_message,
    totalFiles: row.total_files,
    totalGroups: row.total_groups,
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
    updatedAt: Math.floor(new Date(row.updated_at).getTime() / 1000),
  };
}

function mapGroupRow(row: RowDataPacket): PhotoOrganizerGroup {
  return {
    id: row.id,
    batchId: row.batch_id,
    groupKey: row.group_key,
    detectedName: row.detected_name,
    confirmedName: row.confirmed_name,
    passportFilename: row.passport_filename,
    fileList: typeof row.file_list === "string" ? JSON.parse(row.file_list) : row.file_list,
    detectionStatus: row.detection_status,
  };
}

export async function createBatch(originalFilename: string): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO photo_organizer_batches (original_filename, status) VALUES (?, 'uploading')",
    [originalFilename]
  );
  return result.insertId;
}

export async function setBatchStatus(id: number, status: BatchStatus, errorMessage?: string) {
  await pool.query("UPDATE photo_organizer_batches SET status = ?, error_message = ? WHERE id = ?", [
    status,
    errorMessage || null,
    id,
  ]);
}

export async function setBatchCounts(id: number, totalFiles: number, totalGroups: number) {
  await pool.query("UPDATE photo_organizer_batches SET total_files = ?, total_groups = ? WHERE id = ?", [
    totalFiles,
    totalGroups,
    id,
  ]);
}

export async function getBatch(id: number): Promise<PhotoOrganizerBatch | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM photo_organizer_batches WHERE id = ? LIMIT 1", [
    id,
  ]);
  const row = rows[0];
  return row ? mapBatchRow(row) : null;
}

export async function listGroupsForBatch(batchId: number): Promise<PhotoOrganizerGroup[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM photo_organizer_groups WHERE batch_id = ? ORDER BY group_key ASC",
    [batchId]
  );
  return rows.map(mapGroupRow);
}

export async function getGroup(id: number): Promise<PhotoOrganizerGroup | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM photo_organizer_groups WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapGroupRow(row) : null;
}

export interface NewGroup {
  groupKey: string;
  detectedName: string | null;
  passportFilename: string | null;
  fileList: string[];
  detectionStatus: DetectionStatus;
}

export async function insertGroups(batchId: number, groups: NewGroup[]) {
  for (const g of groups) {
    await pool.query(
      `INSERT INTO photo_organizer_groups
        (batch_id, group_key, detected_name, confirmed_name, passport_filename, file_list, detection_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [batchId, g.groupKey, g.detectedName, g.detectedName, g.passportFilename, JSON.stringify(g.fileList), g.detectionStatus]
    );
  }
}

export async function updateGroupConfirmedName(id: number, confirmedName: string) {
  await pool.query("UPDATE photo_organizer_groups SET confirmed_name = ? WHERE id = ?", [confirmedName, id]);
}

export async function deleteBatch(id: number) {
  await pool.query("DELETE FROM photo_organizer_batches WHERE id = ?", [id]);
}
