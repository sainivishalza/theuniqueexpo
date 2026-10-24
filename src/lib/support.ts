// "Ask our team": what a buyer can write about, and the limits. Nothing here touches the database.

export const SUPPORT_TOPICS = ["registration", "tickets", "points", "documents", "other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_SUBJECT_MAX = 150;
export const SUPPORT_BODY_MAX = 4000;
export const SUPPORT_BODY_MIN = 2;

export type SupportStatus = "open" | "closed";
export type SupportWaitingOn = "staff" | "buyer";

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === "string" && (SUPPORT_TOPICS as readonly string[]).includes(value);
}

// A message the person typed: trimmed, line breaks kept, between the minimum and the maximum length. null = not acceptable.
export function cleanSupportBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  return text.length >= SUPPORT_BODY_MIN && text.length <= SUPPORT_BODY_MAX ? text : null;
}

export function cleanSupportSubject(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length >= 2 && text.length <= SUPPORT_SUBJECT_MAX ? text : null;
}
