// A calendar file (.ics) for an all-day event, so a buyer can put the exhibition dates in their phone's calendar.

const pad = (n: number) => String(n).padStart(2, "0");

function compact(date: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replace(/-/g, "") : null;
}

// The day after (the end of an all-day event is exclusive in iCalendar).
function nextDay(date: string): string | null {
  if (!compact(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// Text values: backslash, semicolon, comma and line breaks are escaped (RFC 5545).
function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes are folded onto continuation lines that start with a space.
function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (bytes.encode(current + ch).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export interface IcsEvent {
  uid: string;
  title: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, the last day (inclusive) */
  end: string;
  description?: string;
  url?: string;
  location?: string;
}

const stampOf = (now: Date) => `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

/** The lines of one VEVENT, or null when the dates are not valid. */
function eventLines(event: IcsEvent, stamp: string): string[] | null {
  const start = compact(event.start);
  const end = nextDay(event.end >= event.start ? event.end : event.start);
  if (!start || !end) return null;
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}@theuniqueexpo.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
  ];
}

/** The text of the .ics file, or null when the dates are not valid. */
export function buildIcs(event: IcsEvent, now = new Date()): string | null {
  const body = eventLines(event, stampOf(now));
  if (!body) return null;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Unique Expo//Registration//EN", "CALSCALE:GREGORIAN", ...body, "END:VCALENDAR"];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * A calendar a phone or computer can SUBSCRIBE to: every event in one file, and a hint to look again every 12 hours so new
 * and changed exhibitions appear by themselves. Events with invalid dates are left out.
 */
export function buildIcsFeed(events: IcsEvent[], calendarName: string, now = new Date()): string {
  const stamp = stampOf(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Unique Expo//Exhibitions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    ...events.flatMap((e) => eventLines(e, stamp) ?? []),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
