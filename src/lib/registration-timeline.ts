import type { MyRegistration } from "@/lib/registration-lifecycle";

// The steps of one registration, with the date each was reached, for the progress list on the buyer's screens.
// Pure and shared, so the card, the list and the tests agree on what the steps are.

export type TimelineKey = "registered" | "review" | "waitlisted" | "approved" | "confirmed" | "attended" | "rejected" | "cancelled" | "expired" | "absent";
export type TimelineState = "done" | "current" | "todo" | "problem";

export interface TimelineStep {
  key: TimelineKey;
  state: TimelineState;
  /** When it happened (a UTC timestamp), if known. */
  at: string | null;
  /** A calendar day this step is due by (the confirm-by day while waiting for the buyer to confirm). */
  dueDay: string | null;
}

type Input = Pick<MyRegistration, "status" | "waitlisted" | "createdAt" | "approvedAt" | "confirmBy" | "confirmedAt" | "checkedInAt" | "cancelledAt">;

export function buildTimeline(r: Input): TimelineStep[] {
  const step = (key: TimelineKey, state: TimelineState, at: string | null = null, dueDay: string | null = null): TimelineStep => ({ key, state, at, dueDay });
  const steps: TimelineStep[] = [step("registered", "done", r.createdAt)];

  if (r.status === "rejected") return [...steps, step("rejected", "problem")];

  const wasApproved = ["approved", "confirmed", "attended", "expired", "absent"].includes(r.status) || !!r.approvedAt;
  const wasConfirmed = ["confirmed", "attended", "absent"].includes(r.status) || !!r.confirmedAt;

  if (r.status === "cancelled") {
    if (wasApproved) steps.push(step("approved", "done", r.approvedAt));
    if (wasConfirmed) steps.push(step("confirmed", "done", r.confirmedAt));
    steps.push(step("cancelled", "problem", r.cancelledAt));
    return steps;
  }

  if (r.status === "pending") {
    steps.push(step(r.waitlisted ? "waitlisted" : "review", "current"));
    steps.push(step("approved", "todo"), step("confirmed", "todo"), step("attended", "todo"));
    return steps;
  }

  steps.push(step("approved", "done", r.approvedAt));
  if (r.status === "expired") return [...steps, step("expired", "problem", null, r.confirmBy)];
  if (r.status === "approved") return [...steps, step("confirmed", "current", null, r.confirmBy), step("attended", "todo")];

  steps.push(step("confirmed", "done", r.confirmedAt));
  if (r.status === "absent") return [...steps, step("absent", "problem")];
  if (r.status === "confirmed") return [...steps, step("attended", "current")];
  return [...steps, step("attended", "done", r.checkedInAt)];
}
