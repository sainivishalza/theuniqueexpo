import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { defaultConfirmBy, setRegistrationStatus } from "@/lib/server/expo-registrations-repo";
import { notifyRegistrationDecision } from "@/lib/server/notifications";

// Approving or rejecting many exhibition registrations at once. Only the decision itself is made here: a buyer
// who has already confirmed, attended or cancelled is never moved back by a bulk action (that stays a deliberate,
// one-at-a-time change on the registration's own status menu).

export const MAX_BULK_REGISTRATIONS = 200;

export type Decision = "approved" | "rejected";
export type DecisionOutcome = "updated" | "unchanged" | "skipped" | "not_found";

export interface DecisionResult {
  id: number;
  outcome: DecisionOutcome;
}

// The statuses a registration may be in for the decision to apply.
const ALLOWED_FROM: Record<Decision, string[]> = {
  approved: ["pending", "rejected"],
  rejected: ["pending", "approved"],
};

export async function decideRegistrations(
  ids: number[],
  decision: Decision,
  confirmBy: string | null
): Promise<DecisionResult[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, status, exhibition_id FROM expo_registrations WHERE id IN (?)",
    [ids]
  );
  const found = new Map(rows.map((r) => [Number(r.id), { status: String(r.status), exhibitionId: Number(r.exhibition_id) }]));

  // Without a date of its own, each approval gets its exhibition's default (the day before it starts).
  const defaults = new Map<number, string | null>();
  async function deadlineFor(exhibitionId: number): Promise<string | null> {
    if (confirmBy) return confirmBy;
    if (!defaults.has(exhibitionId)) {
      const exhibition = await getExhibitionBySlugOrId(String(exhibitionId));
      defaults.set(exhibitionId, exhibition ? defaultConfirmBy(exhibition.startDate, exhibition.endDate) : null);
    }
    return defaults.get(exhibitionId) ?? null;
  }

  const results: DecisionResult[] = [];
  for (const id of ids) {
    const row = found.get(id);
    if (!row) {
      results.push({ id, outcome: "not_found" });
      continue;
    }
    if (row.status === decision) {
      results.push({ id, outcome: "unchanged" });
      continue;
    }
    if (!ALLOWED_FROM[decision].includes(row.status)) {
      results.push({ id, outcome: "skipped" });
      continue;
    }
    const deadline = decision === "approved" ? await deadlineFor(row.exhibitionId) : null;
    // The guard in the statement keeps a registration that changed a moment ago (the buyer confirmed it) from being overwritten.
    const ok = await setRegistrationStatusIfStillIn(id, decision, deadline, ALLOWED_FROM[decision]);
    if (!ok) {
      results.push({ id, outcome: "skipped" });
      continue;
    }
    notifyRegistrationDecision(id, decision === "approved", deadline);
    results.push({ id, outcome: "updated" });
  }
  return results;
}

async function setRegistrationStatusIfStillIn(id: number, status: Decision, deadline: string | null, from: string[]): Promise<boolean> {
  // Claim the row first (status moves only when it is still one of the allowed ones), then set the dates the same way a single change does.
  const [claim] = await pool.query<import("mysql2/promise").ResultSetHeader>(
    "UPDATE expo_registrations SET status = ? WHERE id = ? AND status IN (?)",
    [status, id, from]
  );
  if (claim.affectedRows === 0) return false;
  return setRegistrationStatus(id, status, deadline);
}
