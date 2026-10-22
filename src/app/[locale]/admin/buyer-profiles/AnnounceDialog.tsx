"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

const LANGS = ["en", "ru", "zh"] as const;
type Lang = (typeof LANGS)[number];

// Writes one e-mail and sends it to the selected buyers who have a real e-mail address, each in their own
// language: English is required, Russian and Chinese are optional (buyers using those languages get them
// when written, otherwise English).
export default function AnnounceDialog({
  userIds,
  withEmail,
  onClose,
}: {
  userIds: number[];
  /** How many of the selected buyers have a real e-mail address. */
  withEmail: number;
  onClose: () => void;
}) {
  const t = useTranslations("adminBuyerProfiles.announce");
  const ta = useTranslations("adminCommon");
  const ids = { title: useId(), subject: useId(), message: useId() };
  const [lang, setLang] = useState<Lang>("en");
  const [subject, setSubject] = useState<Record<Lang, string>>({ en: "", ru: "", zh: "" });
  const [message, setMessage] = useState<Record<Lang, string>>({ en: "", ru: "", zh: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ queued: number; withoutEmail: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const ready = subject.en.trim().length >= 3 && message.en.trim().length >= 5 && withEmail > 0 && !busy && !result;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/buyer-profiles/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : ta("somethingWentWrong"));
        setConfirming(false);
        return;
      }
      setResult({ queued: data.queued, withoutEmail: data.withoutEmail });
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={ids.title} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={ids.title} className="text-xl font-bold text-heading">{t("title", { count: userIds.length })}</h2>
        {result ? (
          <div className="mt-4 space-y-3">
            <p role="status" className="font-semibold text-emerald-800">{t("done", { count: result.queued })}</p>
            {result.withoutEmail > 0 && <p className="text-sm text-gray-700">{t("skipped", { count: result.withoutEmail })}</p>}
            <Button type="button" variant="save" size="compact" onClick={onClose}>{ta("close")}</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className={`rounded-lg px-3 py-2 text-sm ${withEmail > 0 ? "bg-cream-50 text-gray-800" : "bg-red-50 text-red-800"}`}>
              {withEmail > 0 ? t("recipients", { with: withEmail, total: userIds.length }) : t("noRecipients")}
            </p>
            <div role="tablist" aria-label={t("languages")} className="flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === l ? "bg-emerald-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-cream-50"}`}
                >
                  {t(`lang.${l}`)}{l === "en" ? " *" : ""}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor={ids.subject} className="mb-1.5 block text-sm font-medium text-gray-700">{t("subject")}</label>
              <input id={ids.subject} value={subject[lang]} maxLength={150} onChange={(e) => setSubject((s) => ({ ...s, [lang]: e.target.value }))} autoComplete="off" className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.message} className="mb-1.5 block text-sm font-medium text-gray-700">{t("message")}</label>
              <textarea id={ids.message} value={message[lang]} rows={8} maxLength={5000} onChange={(e) => setMessage((m) => ({ ...m, [lang]: e.target.value }))} className={fieldClasses()} />
              <p className="mt-1 text-xs text-gray-600">{t("messageHint")}</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {confirming ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{t("confirmQuestion", { count: withEmail })}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button type="button" variant="save" size="compact" disabled={busy} onClick={send}>{busy ? t("sending") : t("confirmSend")}</Button>
                  <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => setConfirming(false)}>{t("back")}</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="save" size="compact" disabled={!ready} onClick={() => setConfirming(true)}>{t("send")}</Button>
                <Button type="button" variant="secondaryOutline" size="compact" onClick={onClose}>{ta("cancel")}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
