"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";

interface Prefs { digest: boolean; savedAlerts: boolean }

// "E-mails I get": the optional ones can be turned off here (each one also has a link at the bottom of the e-mail).
// Everything about the person's own registrations, documents, wallet and account is always e-mailed.
export default function MailPreferencesCard() {
  const t = useTranslations("accountMailPrefs");
  const ids = { digest: useId(), savedAlerts: useId() };
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/mail-preferences", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPrefs(d.preferences))
      .catch(() => setUnavailable(true));
  }, []);

  async function change(key: keyof Prefs, value: boolean) {
    setBusy(true);
    setNote("");
    setError("");
    try {
      const res = await fetch("/api/mail-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setPrefs(d.preferences);
        setNote(t("saved"));
      } else setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (unavailable) return null;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="mail-prefs">
      <h2 className="text-lg font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-700">{t("intro")}</p>
      {prefs && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <input id={ids.digest} type="checkbox" checked={prefs.digest} disabled={busy} onChange={() => change("digest", !prefs.digest)} className="mt-1 h-4 w-4" />
            <label htmlFor={ids.digest} className="text-sm text-heading"><span className="font-semibold">{t("digest")}</span><span className="block text-gray-700">{t("digestHelp")}</span></label>
          </div>
          <div className="flex items-start gap-3">
            <input id={ids.savedAlerts} type="checkbox" checked={prefs.savedAlerts} disabled={busy} onChange={() => change("savedAlerts", !prefs.savedAlerts)} className="mt-1 h-4 w-4" />
            <label htmlFor={ids.savedAlerts} className="text-sm text-heading"><span className="font-semibold">{t("savedAlerts")}</span><span className="block text-gray-700">{t("savedAlertsHelp")}</span></label>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-700">{t("always")}</p>
      <p role="status" className="mt-2 min-h-5 text-sm font-medium text-emerald-800">{note}</p>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
