"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateOnly } from "@/lib/client/registration-format";
import type { MyRegistration } from "@/lib/registration-lifecycle";
import Button from "@/components/ui/Button";

interface InviteView { email: string; name: string; invitedAt: string; status: string }
interface InviteResult { email: string; outcome: string }

// Group registration: invite colleagues by e-mail to register for the same exhibition, and see who has.
export default function GroupInvite({ registration, registrationEnabled }: { registration: MyRegistration; registrationEnabled: boolean }) {
  const t = useTranslations("expoRegistrationStatus.group");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [invites, setInvites] = useState<InviteView[] | null>(null);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [mailOn, setMailOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!registrationEnabled || !["pending", "approved", "confirmed", "attended"].includes(registration.status)) return null;
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/exhibitions/${registration.exhibitionSlug}/register`;

  async function show() {
    setOpen(true);
    if (invites !== null) return;
    try {
      const res = await fetch(`/api/expo-registrations/${registration.id}/invites`);
      const data = await res.json().catch(() => ({}));
      setInvites(res.ok ? data.invites ?? [] : []);
    } catch {
      setInvites([]);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResults([]);
    setInvalid([]);
    try {
      const res = await fetch(`/api/expo-registrations/${registration.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInvalid(Array.isArray(data.invalid) ? data.invalid : []);
        const known = ["no_valid_emails", "too_many", "rate_limited", "registration_closed", "not_available", "too_long"];
        setError(t(`errors.${known.includes(data.code) ? data.code : "failed"}`, { max: data.max ?? 10 }));
        return;
      }
      setResults(data.results ?? []);
      setInvalid(data.invalid ?? []);
      setMailOn(data.mailOn !== false);
      setInvites(data.invites ?? []);
      setText("");
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 text-sm";
  return (
    <div className="mt-5 border-t border-gray-100 pt-5" data-testid="group-invite">
      <h4 className="font-bold text-heading">{t("heading")}</h4>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      {!open ? (
        <Button type="button" variant="secondaryOutline" size="compact" className="mt-3" onClick={show} aria-expanded={false}><span aria-hidden="true">👥 </span>{t("open")}</Button>
      ) : (
        <div className="mt-3 space-y-4">
          <form onSubmit={send} className="space-y-3">
            <div>
              <label htmlFor={`gi-emails-${registration.id}`} className="mb-1 block text-sm font-medium text-gray-700">{t("emailsLabel")}</label>
              <textarea id={`gi-emails-${registration.id}`} rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("emailsPlaceholder")} className={`${field} resize-none`} />
              <p className="mt-1 text-xs text-gray-500">{t("emailsHint")}</p>
            </div>
            {error && <p role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" variant="gradientCta" size="block" disabled={busy || !text.trim()}>{busy ? t("sending") : t("send")}</Button>
          </form>

          {(results.length > 0 || invalid.length > 0) && (
            <div role="status" className="rounded-[var(--radius-button)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              <ul className="space-y-0.5">
                {results.map((r) => <li key={r.email} className="[overflow-wrap:anywhere]">{r.email}: {t(`outcomes.${r.outcome}`)}</li>)}
                {invalid.map((v) => <li key={v} className="[overflow-wrap:anywhere]">{v}: {t("outcomes.invalid")}</li>)}
              </ul>
              {!mailOn && results.some((r) => r.outcome === "invited") && <p className="mt-2 font-semibold">{t("mailOff")}</p>}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500">{t("shareLink")}</p>
            <input readOnly aria-label={t("shareLinkLabel")} value={link} onFocus={(e) => e.currentTarget.select()} className={`${field} mt-1 bg-cream-50`} />
          </div>

          {invites && invites.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-heading">{t("invitedHeading", { count: invites.length })}</h5>
              <ul className="mt-2 divide-y divide-gray-100 text-sm">
                {invites.map((i) => (
                  <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{i.name ? `${i.name} · ` : ""}{i.email}<span className="block text-xs text-gray-500">{t("invitedOn", { date: formatDateOnly(i.invitedAt.slice(0, 10), locale) })}</span></span>
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${i.status === "invited" ? "bg-gray-100 text-gray-600" : "bg-emerald-100 text-emerald-800"}`}>{t(`statuses.${i.status}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
