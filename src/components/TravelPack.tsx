"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPlaceholderEmail } from "@/lib/login-id";
import type { MyRegistration } from "@/lib/registration-lifecycle";
import Button from "@/components/ui/Button";

// After approval: everything for the trip in one place -- hotels near the venue, tours around the show, and a request
// for an airport pickup (sent to the team through the same business-trip request the rest of the site uses).
export default function TravelPack({ registration }: { registration: MyRegistration }) {
  const t = useTranslations("expoRegistrationStatus.travel");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [arrival, setArrival] = useState(registration.arrivalDate ?? "");
  const [travelers, setTravelers] = useState("1");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (!["approved", "confirmed"].includes(registration.status) || !user) return null;
  const hasEmail = !!user.email && !isPlaceholderEmail(user.email);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!hasEmail && !contact.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/business-trip-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user!.name,
          email: user!.email,
          whatsapp: contact.trim(),
          exhibitionSlug: registration.exhibitionSlug,
          attendingType: "traveling",
          arrivalDate: arrival,
          travelers: Number(travelers) || 1,
          needs: ["airportTransfer"],
          message: note.trim().slice(0, 1000),
        }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  const card = "rounded-[var(--radius-button)] border border-gray-200 p-4";
  const link = "mt-2 inline-block py-1 text-sm font-semibold text-emerald-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm";
  const field = "w-full rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 text-sm";
  return (
    <div className="mt-5 border-t border-gray-100 pt-5" data-testid="travel-pack">
      <h4 className="font-bold text-heading">{t("heading")}</h4>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className={card}>
          <p className="font-semibold text-heading"><span aria-hidden="true">🏨 </span>{t("hotelsTitle")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("hotelsText")}</p>
          <Link href={`/exhibitions/${registration.exhibitionSlug}/hotels`} className={link}>{t("hotelsLink")}</Link>
        </div>
        <div className={card}>
          <p className="font-semibold text-heading"><span aria-hidden="true">🧭 </span>{t("toursTitle")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("toursText")}</p>
          <Link href={`/plan-business-trip?exhibitionSlug=${encodeURIComponent(registration.exhibitionSlug)}`} className={link}>{t("toursLink")}</Link>
        </div>
        <div className={card}>
          <p className="font-semibold text-heading"><span aria-hidden="true">🚐 </span>{t("pickupTitle")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("pickupText")}</p>
          {state !== "sent" && !open && (
            <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className={`${link} bg-transparent p-0`}>{t("pickupOpen")}</button>
          )}
          {state === "sent" && <p role="status" className="mt-2 text-sm font-semibold text-emerald-900">{t("pickupSent")}</p>}
        </div>
      </div>
      {open && state !== "sent" && (
        <form onSubmit={send} className="mt-4 space-y-3 rounded-[var(--radius-button)] border border-gray-200 p-4">
          <h5 className="font-semibold text-heading">{t("pickupFormHeading")}</h5>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tp-arrival" className="mb-1 block text-sm font-medium text-gray-700">{t("arrivalDate")}</label>
              <input id="tp-arrival" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="tp-travelers" className="mb-1 block text-sm font-medium text-gray-700">{t("travelers")}</label>
              <input id="tp-travelers" type="number" min={1} max={50} value={travelers} onChange={(e) => setTravelers(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="tp-contact" className="mb-1 block text-sm font-medium text-gray-700">{hasEmail ? t("contact") : t("contactRequired")}</label>
            <input id="tp-contact" type="text" maxLength={60} required={!hasEmail} value={contact} onChange={(e) => setContact(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="tp-note" className="mb-1 block text-sm font-medium text-gray-700">{t("note")}</label>
            <textarea id="tp-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} className={`${field} resize-none`} />
          </div>
          {state === "failed" && <p role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("failed")}</p>}
          <Button type="submit" variant="gradientCta" size="block" disabled={state === "sending"}>{state === "sending" ? t("sending") : t("send")}</Button>
        </form>
      )}
    </div>
  );
}
