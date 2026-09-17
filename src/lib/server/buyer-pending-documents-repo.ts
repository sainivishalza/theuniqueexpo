import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import type { DocumentField } from "@/lib/server/buyer-profile-repo";

export interface PendingDocument {
  id: number;
  userId: number;
  name: string;
  email: string;
  docField: DocumentField;
  filename: string;
}

// Small table by nature (one row per still-missing document photo from a
// bulk import) -- listed in full and matched in application code rather
// than queried by filename, so no index on filename is needed.
export async function listPendingDocuments(): Promise<PendingDocument[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.id, d.user_id, u.name, u.email, d.doc_field, d.filename
     FROM buyer_pending_documents d
     JOIN users u ON u.id = d.user_id
     ORDER BY d.id ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    docField: r.doc_field,
    filename: r.filename,
  }));
}

export async function deletePendingDocument(id: number): Promise<void> {
  await pool.query<ResultSetHeader>(`DELETE FROM buyer_pending_documents WHERE id = ?`, [id]);
}
