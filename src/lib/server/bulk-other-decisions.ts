import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { notifyTourRegistrationDecision } from "@/lib/server/notifications";

// Approve / reject (tours) or confirm / cancel (events) several registrations at once, like exhibitions have.
// A registration already in that state is left alone (and nobody is told twice); an id that does not exist is reported.

export const MAX_BULK_OTHER = 200;
export type BulkOutcome = "updated" | "unchanged" | "not_found";
export interface BulkRow {
  id: number;
  outcome: BulkOutcome;
}

export function parseIds(value: unknown): number[] {
  return Array.isArray(value) ? Array.from(new Set<number>(value.filter((v: unknown): v is number => Number.isInteger(v) && (v as number) > 0))) : [];
}

export async function bulkTourDecision(ids: number[], status: "approved" | "rejected"): Promise<BulkRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, status FROM tour_registrations WHERE id IN (?)", [ids]);
  const current = new Map(rows.map((r) => [Number(r.id), String(r.status)]));
  const out: BulkRow[] = [];
  for (const id of ids) {
    const before = current.get(id);
    if (before === undefined) out.push({ id, outcome: "not_found" });
    else if (before === status) out.push({ id, outcome: "unchanged" });
    else {
      await pool.query("UPDATE tour_registrations SET status = ? WHERE id = ? AND status <> ?", [status, id, status]);
      notifyTourRegistrationDecision(id, status === "approved");
      out.push({ id, outcome: "updated" });
    }
  }
  return out;
}

export async function bulkEventDecision(ids: number[], status: "confirmed" | "cancelled"): Promise<BulkRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, status FROM event_registrations WHERE id IN (?)", [ids]);
  const current = new Map(rows.map((r) => [Number(r.id), String(r.status)]));
  const out: BulkRow[] = [];
  for (const id of ids) {
    const before = current.get(id);
    if (before === undefined) out.push({ id, outcome: "not_found" });
    else if (before === status) out.push({ id, outcome: "unchanged" });
    else {
      await pool.query("UPDATE event_registrations SET status = ? WHERE id = ?", [status, id]);
      out.push({ id, outcome: "updated" });
    }
  }
  return out;
}

export function summarize(results: BulkRow[]) {
  return {
    updated: results.filter((r) => r.outcome === "updated").length,
    unchanged: results.filter((r) => r.outcome === "unchanged").length,
    notFound: results.filter((r) => r.outcome === "not_found").length,
    results,
  };
}
