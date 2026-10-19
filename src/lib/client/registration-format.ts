// Date helpers for the registration screens. Dates without a time (confirm-by,
// arrival) are calendar days and must not shift with the viewer's time zone;
// timestamps (approved, checked in) are UTC and are shown in the viewer's own.

import { formatInstantDateTime, localizeDay } from "@/lib/date-format";

export function formatDateOnly(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (locale === "ru" || locale === "zh") return localizeDay(value.slice(0, 10), locale);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (locale === "ru" || locale === "zh") return formatInstantDateTime(date, locale);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export const STATUS_TONE: Record<string, "warning" | "success" | "danger" | "gray"> = {
  pending: "warning",
  approved: "success",
  confirmed: "success",
  attended: "success",
  rejected: "danger",
  expired: "danger",
  absent: "danger",
  cancelled: "gray",
};
