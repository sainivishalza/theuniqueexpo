import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { cleanValue, NO_EXHIBITION, type FieldValues } from "@/lib/announcement-fields";
import { translateString } from "@/lib/server/content-translations";

type Locale = "en" | "ru" | "zh";
const LOCALES: Locale[] = ["en", "ru", "zh"];

export interface PersonFields {
  name: string;
  number: string;
  /** The exhibition's English title, when the buyer has an upcoming registration. */
  exhibitionTitle: string | null;
}

/** Name, buyer number and next upcoming exhibition of each person, for filling {name}, {number} and {exhibition}. */
export async function loadPersonFields(userIds: number[]): Promise<Map<number, PersonFields>> {
  const out = new Map<number, PersonFields>();
  if (userIds.length === 0) return out;
  let people: RowDataPacket[];
  try {
    [people] = await pool.query<RowDataPacket[]>("SELECT id, name, buyer_no FROM users WHERE id IN (?)", [userIds]);
  } catch {
    // Before the buyer numbers existed.
    [people] = await pool.query<RowDataPacket[]>("SELECT id, name FROM users WHERE id IN (?)", [userIds]);
  }
  for (const p of people) out.set(Number(p.id), { name: cleanValue(p.name), number: formatBuyerNumber(p.buyer_no), exhibitionTitle: null });
  // The soonest exhibition they are still going to: registered, not cancelled or rejected, not over.
  const [regs] = await pool.query<RowDataPacket[]>(
    `SELECT r.user_id, e.title FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     WHERE r.user_id IN (?) AND r.status IN ('pending', 'approved', 'confirmed') AND e.end_date >= UTC_DATE()
     ORDER BY e.start_date, e.id`,
    [userIds]
  );
  for (const r of regs) {
    const person = out.get(Number(r.user_id));
    if (person && person.exhibitionTitle === null) person.exhibitionTitle = String(r.title);
  }
  return out;
}

/** The values for one person, written for one language. */
export function valuesFor(person: PersonFields, locale: Locale): FieldValues {
  return {
    name: person.name,
    number: person.number,
    exhibition: person.exhibitionTitle ? cleanValue(translateString(person.exhibitionTitle, locale)) : NO_EXHIBITION[locale],
  };
}

export function valuesForAllLocales(person: PersonFields): Record<Locale, FieldValues> {
  return Object.fromEntries(LOCALES.map((l) => [l, valuesFor(person, l)])) as Record<Locale, FieldValues>;
}
