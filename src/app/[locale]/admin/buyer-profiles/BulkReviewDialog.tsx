"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import type { FormItem } from "@/lib/buyer-form";

// Reviews the documents of every selected buyer at once: mark all documents still waiting as
// verified, or reject one document (with the reason the buyers will see on their profile).
export default function BulkReviewDialog({
  userIds,
  documents,
  documentLabel,
  onClose,
  onDone,
}: {
  userIds: number[];
  documents: FormItem[];
  documentLabel: (item: FormItem) => string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("adminBuyerProfiles.review");
  const ta = useTranslations("adminCommon");
  const ids = { action: useId(), doc: useId(), note: useId() };
  const [action, setAction] = useState<"verify" | "reject">("verify");
  const [documentKey, setDocumentKey] = useState(documents[0]?.key ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState<number | null>(null);

  const ready = !busy && changed === null && (action === "verify" || (documentKey !== "" && note.trim().length >= 3));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function run() {
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/buyer-profiles/bulk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, action, documentKey: action === "reject" ? documentKey : undefined, note: action === "reject" ? note.trim() : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : ta("somethingWentWrong"));
        return;
      }
      setChanged(Number(data.changed) || 0);
      onDone();
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={`${ids.action}-title`} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={`${ids.action}-title`} className="text-xl font-bold text-heading">{t("title", { count: userIds.length })}</h2>
        {changed !== null ? (
          <div className="mt-4 space-y-3">
            <p role="status" className="font-semibold text-emerald-800">{t("done", { changed })}</p>
            <Button type="button" variant="save" size="compact" onClick={onClose}>{ta("close")}</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-gray-700">{t("actionLabel")}</legend>
              <label className="flex items-start gap-2 py-1 text-sm text-gray-800">
                <input type="radio" name={ids.action} checked={action === "verify"} onChange={() => setAction("verify")} className="mt-1" />
                <span><span className="font-semibold">{t("verify")}</span><span className="block text-xs text-gray-600">{t("verifyHint")}</span></span>
              </label>
              <label className="flex items-start gap-2 py-1 text-sm text-gray-800">
                <input type="radio" name={ids.action} checked={action === "reject"} onChange={() => setAction("reject")} className="mt-1" />
                <span><span className="font-semibold">{t("reject")}</span><span className="block text-xs text-gray-600">{t("rejectHint")}</span></span>
              </label>
            </fieldset>
            {action === "reject" && (
              <>
                <div>
                  <label htmlFor={ids.doc} className="mb-1.5 block text-sm font-medium text-gray-700">{t("documentLabel")}</label>
                  <select id={ids.doc} value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} className={fieldClasses()}>
                    {documents.map((d) => <option key={d.key} value={d.key}>{documentLabel(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={ids.note} className="mb-1.5 block text-sm font-medium text-gray-700">{t("reasonLabel")}</label>
                  <input id={ids.note} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} autoComplete="off" placeholder={t("reasonPlaceholder")} className={fieldClasses()} />
                </div>
              </>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="save" size="compact" disabled={!ready} onClick={run}>{busy ? t("working") : action === "verify" ? t("confirmVerify") : t("confirmReject")}</Button>
              <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={onClose}>{ta("cancel")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
