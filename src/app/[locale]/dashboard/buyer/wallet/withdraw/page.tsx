"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import { newClientKey, WITHDRAWAL_METHODS, type WithdrawalMethod } from "@/lib/wallet";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";
import WalletLayout from "../_components/WalletLayout";

interface Summary { balance: number; frozen: boolean; settings: { withdrawMin: number; withdrawalsEnabled: boolean } }
interface Withdrawal {
  id: number; points: number; method: WithdrawalMethod; accountName: string; bankName: string; bankAccountMasked: string;
  status: string; payoutReference: string; adminNote: string; createdAt: string;
}

const TONE: Record<string, BadgeTone> = { pending: "warning", paid: "success", rejected: "danger", cancelled: "gray" };
const METHOD_ICONS: Record<WithdrawalMethod, string> = { alipay: "🟦", wechat: "🟩", bank: "🏦" };

export default function WithdrawPage() {
  const t = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { points: useId(), name: useId(), bankName: useId(), branch: useId(), account: useId(), note: useId(), password: useId() };
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Withdrawal[] | null>(null);
  const [method, setMethod] = useState<WithdrawalMethod>("alipay");
  const [pointsText, setPointsText] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isBuyer = user?.role === "buyer";
  const points = pointsFromText(pointsText);
  const bank = method === "bank";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestKey = useMemo(() => newClientKey(), [pointsText, method, qrImage, accountName, bankName, bankBranch, bankAccount, note]);

  const reload = useCallback(async () => {
    const [s, l] = await Promise.all([walletApi<Summary>("/api/wallet"), walletApi<{ items: Withdrawal[] }>("/api/wallet/withdrawals")]);
    if (!s.ok || !l.ok) {
      setError(t(`errors.${errorKey(s.data.code || l.data.code)}`));
      return;
    }
    setSummary(s.data);
    setItems(l.data.items);
  }, [t]);

  useEffect(() => {
    if (isBuyer) reload();
  }, [isBuyer, reload]);

  const min = summary?.settings.withdrawMin ?? 1;
  const detailsOk = bank
    ? accountName.trim() !== "" && bankName.trim() !== "" && /^[0-9 ]{6,30}$/.test(bankAccount)
    : qrImage !== "";
  const pointsOk = points !== null && points >= min && (!summary || points <= summary.balance);
  const ready = pointsOk && detailsOk && password.length > 0;

  async function submit() {
    if (!ready || points === null || busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    const res = await walletApi("/api/wallet/withdrawals", {
      method: "POST",
      body: { points, method, qrImage: bank ? "" : qrImage, accountName, bankName, bankBranch, bankAccount, note, key: requestKey, password },
    });
    setBusy(false);
    setPassword("");
    setReviewing(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSent(true);
    setPointsText("");
    setQrImage("");
    setNote("");
    reload();
  }

  async function cancel(id: number) {
    setError("");
    const res = await walletApi(`/api/wallet/withdrawals/${id}`, { method: "PATCH", body: { action: "cancel" } });
    if (!res.ok) setError(t(`errors.${errorKey(res.data.code)}`));
    reload();
  }

  const disabled = summary ? !summary.settings.withdrawalsEnabled || summary.frozen : false;

  return (
    <WalletLayout title={t("withdraw.title")} subtitle={t("withdraw.subtitle")}>
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {sent && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t("withdraw.sent")}</p>}

        <Card shadow="sm" bordered={false} className="p-6">
          {!summary ? (
            <p className="text-gray-600">{t("loading")}</p>
          ) : (
            <>
              <p className="text-gray-800">{t("withdraw.available", { points: formatNumber(summary.balance) })}</p>
              <p className="text-sm text-gray-600">{t("withdraw.minimum", { points: formatNumber(summary.settings.withdrawMin) })} {t("withdraw.howItWorks")}</p>
              {disabled && <p role="alert" className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">{summary.frozen ? t("frozenNotice") : t("errors.withdrawals_disabled")}</p>}

              {!disabled && !reviewing && (
                <form
                  className="mt-5 space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (ready) setReviewing(true);
                  }}
                >
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">{t("withdraw.method")}</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {WITHDRAWAL_METHODS.map((m) => (
                        <label
                          key={m}
                          className={`relative flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-emerald-900 focus-within:outline-offset-2 ${
                            method === m ? "border-emerald-900 bg-cream-50" : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input type="radio" name="withdraw-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                          <span className="text-2xl" aria-hidden="true">{METHOD_ICONS[m]}</span>
                          <span className="font-semibold text-heading">{t(`methods.${m}`)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor={ids.points} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.points")}</label>
                    <input id={ids.points} inputMode="numeric" value={pointsText} onChange={(e) => setPointsText(e.target.value)} autoComplete="off" className={fieldClasses(pointsText !== "" && !pointsOk)} />
                    {pointsText !== "" && !pointsOk && <p className="mt-1 text-xs text-red-700">{points !== null && points < min ? t("errors.below_minimum") : points !== null ? t("errors.insufficient_funds") : t("errors.invalid_amount")}</p>}
                  </div>

                  {!bank ? (
                    <>
                      <UploadField label={t(`withdraw.qr.${method}`)} value={qrImage} onChange={setQrImage} onError={setError} high required invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
                      <p className="-mt-3 text-xs text-gray-600">{t("withdraw.qrHint")}</p>
                      <div>
                        <label htmlFor={ids.name} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.accountNameOptional")}</label>
                        <input id={ids.name} value={accountName} maxLength={150} onChange={(e) => setAccountName(e.target.value)} autoComplete="off" className={fieldClasses()} />
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor={ids.name} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.holder")}</label>
                        <input id={ids.name} value={accountName} maxLength={150} onChange={(e) => setAccountName(e.target.value)} autoComplete="off" className={fieldClasses()} />
                      </div>
                      <div>
                        <label htmlFor={ids.bankName} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.bankName")}</label>
                        <input id={ids.bankName} value={bankName} maxLength={150} onChange={(e) => setBankName(e.target.value)} autoComplete="off" className={fieldClasses()} />
                      </div>
                      <div>
                        <label htmlFor={ids.branch} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.branch")}</label>
                        <input id={ids.branch} value={bankBranch} maxLength={200} onChange={(e) => setBankBranch(e.target.value)} autoComplete="off" className={fieldClasses()} />
                      </div>
                      <div>
                        <label htmlFor={ids.account} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.account")}</label>
                        <input id={ids.account} inputMode="numeric" value={bankAccount} maxLength={40} onChange={(e) => setBankAccount(e.target.value)} autoComplete="off" className={fieldClasses(bankAccount !== "" && !/^[0-9 ]{6,30}$/.test(bankAccount))} />
                        <p className="mt-1 text-xs text-gray-600">{t("withdraw.accountHint")}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdraw.note")}</label>
                    <input id={ids.note} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} autoComplete="off" className={fieldClasses()} />
                  </div>
                  <div>
                    <label htmlFor={ids.password} className="block text-sm font-medium text-gray-700 mb-1.5">{t("send.password")}</label>
                    <input id={ids.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={fieldClasses()} />
                    <p className="mt-1 text-xs text-gray-600">{t("send.passwordHint")}</p>
                  </div>
                  <Button type="submit" variant="gradientCta" size="blockMd" disabled={!ready}>{t("send.review")}</Button>
                </form>
              )}

              {!disabled && reviewing && points !== null && (
                <div className="mt-5 space-y-4" role="group" aria-label={t("withdraw.confirmTitle")}>
                  <h2 className="text-lg font-bold text-heading">{t("withdraw.confirmTitle")}</h2>
                  <p className="text-gray-800">{t("withdraw.confirmText", { points: formatNumber(points), method: t(`methods.${method}`) })}</p>
                  {bank && <p className="text-sm text-gray-700">{accountName} · {bankName} · {bankAccount}</p>}
                  <p className="text-sm text-gray-600">{t("withdraw.confirmWarning")}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="gradientCta" size="wide" onClick={submit} disabled={busy}>{busy ? t("sending") : t("withdraw.confirmButton")}</Button>
                    <Button type="button" variant="ghost" size="wide" onClick={() => setReviewing(false)} disabled={busy}>{t("send.edit")}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t("withdraw.history")}</h2>
          {items && items.length === 0 && <p className="text-gray-600">{t("withdraw.historyEmpty")}</p>}
          <ul className="divide-y divide-gray-100">
            {items?.map((x) => (
              <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-heading">{formatNumber(x.points)} {t("pointsUnit")} · {t(`methods.${x.method}`)}</p>
                  {x.method === "bank" && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{x.bankName} {x.bankAccountMasked}</p>}
                  {x.payoutReference && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{t("withdraw.payoutReference")}: {x.payoutReference}</p>}
                  {x.adminNote && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{x.adminNote}</p>}
                  <p className="text-xs text-gray-600">{formatInstantDateTime(x.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={TONE[x.status] || "gray"} size="status">{t(`status.${x.status}`)}</Badge>
                  {x.status === "pending" && <Button type="button" variant="ghost" size="xs" onClick={() => cancel(x.id)}>{t("cancel")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </WalletLayout>
  );
}
