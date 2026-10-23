"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

export interface BulkDecisionResult {
  updated: number;
  unchanged: number;
  skipped: number;
  notFound: number;
}

// Approve or reject the selected exhibition registrations in one go (see /api/admin/expo-registrations/bulk-status).
export default function BulkDecisionDialog({
  ids,
  decision,
  defaultConfirmBy,
  onClose,
  onDone,
}: {
  ids: number[];
  decision: "approved" | "rejected";
  /** Shown as a hint when the date is left empty (the exhibitions' own default is used then). */
  defaultConfirmBy?: string | null;
  onClose: () => void;
  onDone: (result: BulkDecisionResult) => void;
}) {
  const t = useTranslations("adminBulkDecision");
  const ta = useTranslations("adminCommon");
  const ids2 = { title: useId(), date: useId() };
  const [confirmBy, setConfirmBy] = useState(defaultConfirmBy ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkDecisionResult | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function run() {
    if (busy || result) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/expo-registrations/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: decision, ...(decision === "approved" && confirmBy ? { confirmBy } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : ta("somethingWentWrong"));
        return;
      }
      const r: BulkDecisionResult = { updated: Number(data.updated) || 0, unchanged: Number(data.unchanged) || 0, skipped: Number(data.skipped) || 0, notFound: Number(data.notFound) || 0 };
      setResult(r);
      onDone(r);
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={ids2.title} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={ids2.title} className="text-xl font-bold text-heading">{t(decision === "approved" ? "approveTitle" : "rejectTitle", { count: ids.length })}</h2>
        {result ? (
          <div className="mt-4 space-y-2">
            <p role="status" className="font-semibold text-emerald-800">{t("done", { count: result.updated })}</p>
            {result.unchanged > 0 && <p className="text-sm text-gray-700">{t("unchanged", { count: result.unchanged })}</p>}
            {result.skipped > 0 && <p className="text-sm text-gray-700">{t("skipped", { count: result.skipped })}</p>}
            {result.notFound > 0 && <p className="text-sm text-gray-700">{t("notFound", { count: result.notFound })}</p>}
            <div className="pt-2"><Button type="button" variant="save" size="compact" onClick={onClose}>{ta("close")}</Button></div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">{t(decision === "approved" ? "approveHint" : "rejectHint")}</p>
            {decision === "approved" && (
              <div>
                <label htmlFor={ids2.date} className="mb-1.5 block text-sm font-medium text-gray-700">{t("confirmBy")}</label>
                <input id={ids2.date} type="date" value={confirmBy} onChange={(e) => setConfirmBy(e.target.value)} className={fieldClasses()} />
                <p className="mt-1 text-xs text-gray-600">{t("leaveEmpty")}</p>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="save" size="compact" disabled={busy} onClick={run}>
                {busy ? t("working") : t(decision === "approved" ? "approveSubmit" : "rejectSubmit", { count: ids.length })}
              </Button>
              <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={onClose}>{ta("cancel")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
