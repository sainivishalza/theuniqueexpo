"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/lib/client/registration-format";

interface Link { id: number; createdByName: string; expiresAt: string; views: number }

// A link that shows ONE document to someone without an account (for example a visa agent), for 1 hour to 7 days.
// The link is shown once, when it is made (only its fingerprint is stored); the active ones can be stopped at any time.
export default function DocumentShare({ userId, docKey, docLabel }: { userId: number; docKey: string; docLabel: string }) {
  const t = useTranslations("adminDocShare");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const [links, setLinks] = useState<Link[] | null>(null);
  const [fresh, setFresh] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const base = `/api/admin/buyer-profiles/${userId}/documents/${encodeURIComponent(docKey)}/share`;

  useEffect(() => {
    if (!open) return;
    fetch(base, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((d) => setLinks(d.links ?? []))
      .catch(() => setLinks([]));
  }, [open, base]);

  async function make() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
        return;
      }
      setFresh(`${window.location.origin}${d.path}`);
      setLinks(d.links ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function stop(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${base}?id=${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setLinks(d.links ?? []);
        setNote(t("revoked"));
      } else setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh);
      setNote(t("copied"));
    } catch {
      /* the link is in the box; it can be copied by hand */
    }
  }

  const choices = [1, 24, 72, 168];
  const choiceLabel = (h: number) => (h < 24 ? t("hours", { hours: h }) : t("days", { days: h / 24 }));

  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs font-semibold text-emerald-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
        {t("open")}<span className="sr-only"> — {docLabel}</span>
      </button>
      {open && (
        <div role="group" aria-label={`${t("title")}: ${docLabel}`} className="mt-1.5 space-y-2 rounded-lg border border-gray-200 bg-white p-2 text-xs" data-testid="doc-share">
          <p className="text-gray-700">{t("warning")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block font-medium text-gray-700">{t("howLong")}</span>
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={fieldClasses()} aria-label={`${t("howLong")}: ${docLabel}`}>
                {choices.map((h) => <option key={h} value={h}>{choiceLabel(h)}</option>)}
              </select>
            </label>
            <Button type="button" variant="save" size="xs" disabled={busy} onClick={make}>{busy ? t("making") : t("make")}</Button>
          </div>
          {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
          {note && <p role="status" className="font-semibold text-emerald-800">{note}</p>}
          {fresh && (
            <div>
              <p className="mb-1 font-medium text-gray-700">{t("newLink")}</p>
              <input readOnly value={fresh} aria-label={t("linkField")} onFocus={(e) => e.currentTarget.select()} className={fieldClasses()} data-testid="doc-share-url" />
              <Button type="button" variant="secondaryOutline" size="xs" className="mt-1" onClick={copy}>{t("copy")}</Button>
            </div>
          )}
          <div>
            <p className="mb-1 font-medium text-gray-700">{t("active")}</p>
            {links && links.length === 0 && <p className="text-gray-600">{t("none")}</p>}
            <ul className="space-y-1">
              {(links ?? []).map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2" data-testid="doc-share-link">
                  <span className="min-w-0 text-gray-700">{t("row", { name: l.createdByName || "—", date: formatDateTime(l.expiresAt, locale), views: l.views })}</span>
                  <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => stop(l.id)}>{t("revoke")}</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
