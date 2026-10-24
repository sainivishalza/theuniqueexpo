"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import { BULK_MAX_BUYERS, BULK_MAX_POINTS, newClientKey } from "@/lib/wallet";
import { parsePassportList } from "@/lib/passport-list";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Found { userId: number; name: string; buyerNumber: string; passport: string; typed: string }
interface Checked { found: Found[]; notFound: string[]; ambiguous: string[]; blocked: string[]; typed: number }
interface Paid { amount: number; typed: number; paid: number; failed: number; notFound: string[]; ambiguous: string[]; blocked: string[] }

// Top up many buyers at once: paste their passport numbers, one amount and a reason. The numbers are checked first (who is
// found, which are not), then everyone found is paid in one go. Numbers nobody has are shown as alerts.
export default function BulkTopupTab() {
  const t = useTranslations("adminWallet");
  const tb = useTranslations("adminWallet.bulkTopup");
  const ids = { list: useId(), amount: useId(), reason: useId() };
  const [text, setText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState<{ result: Checked; text: string } | null>(null);
  const [paid, setPaid] = useState<Paid | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tokens = useMemo(() => parsePassportList(text), [text]);
  const amount = pointsFromText(amountText);
  const validAmount = amount !== null && amount <= BULK_MAX_POINTS;
  const fresh = checked !== null && checked.text === text;
  const found = fresh ? checked.result.found.length : 0;
  // One request key per distinct request, so a double click cannot pay anyone twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => newClientKey(), [text, amountText, reason]);
  const canPay = fresh && found > 0 && validAmount && reason.trim().length >= 3 && !busy && paid === null;

  async function check() {
    if (tokens.length === 0 || tokens.length > BULK_MAX_BUYERS) return;
    setBusy(true);
    setError("");
    setPaid(null);
    const res = await walletApi<Checked>("/api/admin/wallet/bulk-topup", { method: "POST", body: { action: "check", passports: text } });
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setChecked({ result: res.data, text });
  }

  async function pay() {
    if (!canPay || amount === null) return;
    setBusy(true);
    setError("");
    const res = await walletApi<Paid>("/api/admin/wallet/bulk-topup", { method: "POST", body: { action: "pay", passports: text, amount, note: reason.trim(), key } });
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setPaid(res.data);
  }

  const preview = fresh && paid === null ? checked.result : null;
  const result = paid ?? preview;
  const alerts = result
    ? ([
        [result.notFound, "notFound"],
        [result.ambiguous, "ambiguous"],
        [result.blocked, "blocked"],
      ] as const).filter(([list]) => list.length > 0)
    : [];

  return (
    <div className="space-y-5" data-testid="bulk-topup">
      <Card shadow="sm" bordered={false} className="p-5 space-y-4">
        <h2 className="text-lg font-bold text-heading">{tb("title")}</h2>
        <p className="text-sm text-gray-700">{tb("intro")}</p>
        <div>
          <label htmlFor={ids.list} className="block text-sm font-medium text-gray-700 mb-1.5">{tb("passports")}</label>
          <textarea id={ids.list} rows={6} value={text} onChange={(e) => { setText(e.target.value); setPaid(null); }} className={fieldClasses(tokens.length > BULK_MAX_BUYERS)} autoComplete="off" spellCheck={false} />
          <p className="mt-1 text-xs text-gray-600">{tb("passportsHint", { max: BULK_MAX_BUYERS })}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{tb("amount")}</label>
            <input id={ids.amount} inputMode="numeric" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={fieldClasses(amountText !== "" && !validAmount)} placeholder="100" autoComplete="off" />
            <p className="mt-1 text-xs text-gray-600">{tb("amountHint", { max: formatNumber(BULK_MAX_POINTS) })}</p>
          </div>
          <div>
            <label htmlFor={ids.reason} className="block text-sm font-medium text-gray-700 mb-1.5">{tb("reason")}</label>
            <input id={ids.reason} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className={fieldClasses()} autoComplete="off" />
          </div>
        </div>
        <Button type="button" variant="secondaryOutline" size="compact" disabled={busy || tokens.length === 0 || tokens.length > BULK_MAX_BUYERS} onClick={check} data-testid="bulk-check">{busy && !paid ? tb("checking") : tb("check")}</Button>
      </Card>

      {error && <p role="alert" className="text-red-700">{error}</p>}
      {checked && !fresh && paid === null && <p role="status" className="text-sm font-semibold text-amber-900" data-testid="bulk-stale">{tb("recheck")}</p>}

      {result && (
        <Card shadow="sm" bordered={false} className="p-5 space-y-4" data-testid="bulk-result">
          {paid ? (
            <>
              <p role="status" className="font-semibold text-emerald-800" data-testid="bulk-done">{tb("done", { amount: formatNumber(paid.amount), paid: paid.paid })}</p>
              {paid.failed > 0 && <p role="alert" className="text-sm text-red-700">{tb("doneFailed", { failed: paid.failed })}</p>}
            </>
          ) : (
            preview && (
              <>
                <h3 className="font-bold text-heading" data-testid="bulk-found-title">{tb("foundTitle", { count: preview.found.length, typed: preview.typed })}</h3>
                {preview.found.length === 0 ? (
                  <p className="text-gray-700">{tb("noneFound")}</p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-gray-800" data-testid="bulk-found">
                    {preview.found.map((f) => (
                      <li key={f.userId} className="[overflow-wrap:anywhere]">{tb("foundRow", { name: f.name, number: f.buyerNumber, passport: f.passport })}</li>
                    ))}
                  </ul>
                )}
              </>
            )
          )}
          {alerts.map(([list, kind]) => (
            <p key={kind} role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 [overflow-wrap:anywhere]" data-testid={`bulk-${kind}`}>
              {tb(kind, { count: list.length, list: list.join(", ") })}
            </p>
          ))}
          {preview && preview.found.length > 0 && validAmount && amount !== null && (
            <p className="rounded-xl bg-cream-50 px-3 py-2 text-sm font-semibold text-heading" data-testid="bulk-summary">{tb("summary", { amount: formatNumber(amount), count: preview.found.length, total: formatNumber(amount * preview.found.length) })}</p>
          )}
          {preview && (
            <Button type="button" variant="gradientCta" size="compact" disabled={!canPay} onClick={pay} data-testid="bulk-pay">{busy ? tb("paying") : tb("pay", { count: found })}</Button>
          )}
        </Card>
      )}
    </div>
  );
}
