"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import { newClientKey } from "@/lib/wallet";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";
import WalletLayout from "../_components/WalletLayout";

interface Info { topupInstructions: string; companyAlipayQr: string; companyWechatQr: string; companyBankDetails: string }
interface Topup { id: number; points: number; approvedPoints: number | null; reference: string; status: string; adminNote: string; createdAt: string }

const TONE: Record<string, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "gray" };

export default function TopUpPage() {
  const t = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { points: useId(), reference: useId(), note: useId() };
  const [info, setInfo] = useState<Info | null>(null);
  const [items, setItems] = useState<Topup[] | null>(null);
  const [pointsText, setPointsText] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isBuyer = user?.role === "buyer";
  const points = pointsFromText(pointsText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestKey = useMemo(() => newClientKey(), [pointsText, reference, note, proof]);

  const reload = useCallback(async () => {
    const [i, l] = await Promise.all([walletApi<Info>("/api/wallet/topup-info"), walletApi<{ items: Topup[] }>("/api/wallet/topups")]);
    if (!i.ok || !l.ok) {
      setError(t(`errors.${errorKey(i.data.code || l.data.code)}`));
      return;
    }
    setInfo(i.data);
    setItems(l.data.items);
  }, [t]);

  useEffect(() => {
    if (isBuyer) reload();
  }, [isBuyer, reload]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (points === null || !proof || busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    const res = await walletApi("/api/wallet/topups", { method: "POST", body: { points, reference, note, proof, key: requestKey } });
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSent(true);
    setPointsText("");
    setReference("");
    setNote("");
    setProof("");
    reload();
  }

  async function cancel(id: number) {
    setError("");
    const res = await walletApi(`/api/wallet/topups/${id}`, { method: "PATCH", body: { action: "cancel" } });
    if (!res.ok) setError(t(`errors.${errorKey(res.data.code)}`));
    reload();
  }

  const hasPayInfo = !!info && (info.topupInstructions || info.companyAlipayQr || info.companyWechatQr || info.companyBankDetails);

  return (
    <WalletLayout title={t("topup.title")} subtitle={t("topup.subtitle")}>
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-1">{t("topup.step1")}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("topup.rate")}</p>
          {!info ? (
            <p className="text-gray-600">{t("loading")}</p>
          ) : !hasPayInfo ? (
            <p className="text-gray-700">{t("topup.noInstructions")}</p>
          ) : (
            <div className="space-y-4">
              {info.topupInstructions && <p className="whitespace-pre-wrap text-gray-800 [overflow-wrap:anywhere]">{info.topupInstructions}</p>}
              <div className="flex flex-wrap gap-6">
                {info.companyAlipayQr && (
                  <figure className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={info.companyAlipayQr} alt={t("topup.alipayQrAlt")} className="h-44 w-44 rounded-lg border border-gray-200 object-contain bg-white" />
                    <figcaption className="mt-1 text-sm font-semibold text-gray-700">Alipay 支付宝</figcaption>
                  </figure>
                )}
                {info.companyWechatQr && (
                  <figure className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={info.companyWechatQr} alt={t("topup.wechatQrAlt")} className="h-44 w-44 rounded-lg border border-gray-200 object-contain bg-white" />
                    <figcaption className="mt-1 text-sm font-semibold text-gray-700">WeChat 微信</figcaption>
                  </figure>
                )}
              </div>
              {info.companyBankDetails && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">{t("topup.bankTitle")}</h3>
                  <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800 [overflow-wrap:anywhere]">{info.companyBankDetails}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-1">{t("topup.step2")}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("topup.step2Hint")}</p>
          {sent && <p role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t("topup.sent")}</p>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor={ids.points} className="block text-sm font-medium text-gray-700 mb-1.5">{t("topup.points")}</label>
              <input id={ids.points} inputMode="numeric" value={pointsText} onChange={(e) => setPointsText(e.target.value)} autoComplete="off" className={fieldClasses(pointsText !== "" && points === null)} />
              <p className="mt-1 text-xs text-gray-600">{t("topup.pointsHint")}</p>
            </div>
            <div>
              <label htmlFor={ids.reference} className="block text-sm font-medium text-gray-700 mb-1.5">{t("topup.reference")}</label>
              <input id={ids.reference} value={reference} maxLength={150} onChange={(e) => setReference(e.target.value)} autoComplete="off" className={fieldClasses()} />
            </div>
            <UploadField label={t("topup.proof")} value={proof} onChange={setProof} onError={setError} allowPdf required invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
            <div>
              <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("topup.note")}</label>
              <textarea id={ids.note} rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={fieldClasses()} />
            </div>
            <Button type="submit" variant="gradientCta" size="blockMd" disabled={busy || points === null || !proof}>{busy ? t("sending") : t("topup.submit")}</Button>
          </form>
        </Card>

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t("topup.history")}</h2>
          {items && items.length === 0 && <p className="text-gray-600">{t("topup.historyEmpty")}</p>}
          <ul className="divide-y divide-gray-100">
            {items?.map((x) => (
              <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-heading">
                    {formatNumber(x.approvedPoints ?? x.points)} {t("pointsUnit")}
                    {x.approvedPoints !== null && x.approvedPoints !== x.points && <span className="ml-2 text-sm font-normal text-gray-600">({t("topup.asked", { points: formatNumber(x.points) })})</span>}
                  </p>
                  {x.reference && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{x.reference}</p>}
                  {x.adminNote && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{x.adminNote}</p>}
                  <p className="text-xs text-gray-600">{formatInstantDateTime(x.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={TONE[x.status] || "gray"} size="status">{t(`status.${x.status}`)}</Badge>
                  {x.status === "pending" && (
                    <Button type="button" variant="ghost" size="xs" onClick={() => cancel(x.id)}>{t("cancel")}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </WalletLayout>
  );
}
