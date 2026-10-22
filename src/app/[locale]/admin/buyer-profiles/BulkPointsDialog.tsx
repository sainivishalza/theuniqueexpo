"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import { BULK_MAX_POINTS, newClientKey } from "@/lib/wallet";

interface Result {
  added: number;
  failed: { userId: number; code: string }[];
  amount: number;
}

// Gives the same points to every selected buyer: type the amount and the reason, see the
// total, then confirm. Each buyer's wallet history shows the reason.
export default function BulkPointsDialog({ userIds, onClose, onDone }: { userIds: number[]; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("adminBuyerProfiles");
  const tw = useTranslations("adminWallet");
  const ta = useTranslations("adminCommon");
  const ids = { amount: useId(), reason: useId() };
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  // One request key per distinct request, so a double click cannot credit anyone twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => newClientKey(), [amountText, reason, userIds.length]);
  const amount = pointsFromText(amountText);
  const validAmount = amount !== null && amount <= BULK_MAX_POINTS;
  const ready = validAmount && reason.trim().length >= 3 && !busy && !result;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function give() {
    if (!ready || amount === null) return;
    setBusy(true);
    setError("");
    const res = await walletApi<Result>("/api/admin/wallet/bulk-adjust", { method: "POST", body: { userIds, amount, note: reason.trim(), key } });
    setBusy(false);
    if (!res.ok) {
      setError(tw(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setResult(res.data);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={`${ids.amount}-title`} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={`${ids.amount}-title`} className="text-xl font-bold text-heading">{t("bulk.title", { count: userIds.length })}</h2>
        {result ? (
          <div className="mt-4 space-y-3">
            <p role="status" className="font-semibold text-emerald-800">{t("bulk.done", { amount: formatNumber(result.amount), added: result.added })}</p>
            {result.failed.length > 0 && <p role="alert" className="text-sm text-red-700">{t("bulk.someFailed", { failed: result.failed.length })}</p>}
            <Button type="button" variant="save" size="compact" onClick={onClose}>{ta("close")}</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor={ids.amount} className="mb-1.5 block text-sm font-medium text-gray-700">{t("bulk.amountLabel")}</label>
              <input id={ids.amount} value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="numeric" autoComplete="off" autoFocus placeholder="100" className={fieldClasses(amountText !== "" && !validAmount)} />
              <p className="mt-1 text-xs text-gray-600">{t("bulk.limitHint", { max: formatNumber(BULK_MAX_POINTS) })}</p>
            </div>
            <div>
              <label htmlFor={ids.reason} className="mb-1.5 block text-sm font-medium text-gray-700">{t("bulk.reasonLabel")}</label>
              <input id={ids.reason} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} autoComplete="off" className={fieldClasses()} />
            </div>
            {validAmount && amount !== null && (
              <p className="rounded-xl bg-cream-50 px-3 py-2 text-sm font-semibold text-heading">
                {t("bulk.summary", { count: userIds.length, amount: formatNumber(amount), total: formatNumber(amount * userIds.length) })}
              </p>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="save" size="compact" disabled={!ready} onClick={give}>{busy ? t("bulk.giving") : t("bulk.confirm")}</Button>
              <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={onClose}>{ta("cancel")}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
