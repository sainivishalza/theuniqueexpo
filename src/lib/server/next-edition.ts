import { listExhibitions } from "@/lib/server/exhibitions-repo";
import type { MyRegistration, NextEdition } from "@/lib/registration-lifecycle";

// "Register again for the next edition": for an exhibition the buyer attended, the next exhibition of the same series
// (the admin gives editions of one event the same series name) that starts after it ends, is still open for
// registration, and the buyer has not already registered for.

type WithEdition<T> = T & { nextEdition?: NextEdition };

const today = () => new Date().toISOString().slice(0, 10);

export async function withNextEditions<T extends Pick<MyRegistration, "exhibitionId" | "status" | "exhibitionEnd">>(registrations: T[], locale?: string): Promise<WithEdition<T>[]> {
  const eligible = registrations.filter((r) => isOver(r));
  if (eligible.length === 0) return registrations;
  const all = await listExhibitions(locale);
  const mine = new Set(registrations.filter((r) => r.status !== "cancelled" && r.status !== "rejected").map((r) => Number(r.exhibitionId)));
  const bySeries = all.filter((e) => e.series.trim() && e.registrationEnabled && e.endDate >= today());
  return registrations.map((r) => {
    if (!eligible.includes(r)) return r;
    const from = all.find((e) => Number(e.id) === Number(r.exhibitionId));
    const series = from?.series.trim().toLowerCase();
    if (!from || !series) return r;
    const next = bySeries
      .filter((e) => e.series.trim().toLowerCase() === series && Number(e.id) !== Number(from.id) && e.startDate > from.endDate && !mine.has(Number(e.id)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    return next ? { ...r, nextEdition: { slug: next.slug, title: next.title, startDate: next.startDate, endDate: next.endDate, closes: next.registrationCloses } } : r;
  });
}

// Someone who went to the exhibition (or confirmed and the exhibition is over).
function isOver(r: Pick<MyRegistration, "status" | "exhibitionEnd">): boolean {
  return r.status === "attended" || (r.status === "confirmed" && !!r.exhibitionEnd && r.exhibitionEnd.slice(0, 10) < today());
}
