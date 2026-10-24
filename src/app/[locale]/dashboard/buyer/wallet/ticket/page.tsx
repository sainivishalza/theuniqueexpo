"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { decodeQrFromDataUrl } from "@/lib/client/qr-decode";
import { newClientKey } from "@/lib/wallet";
import { parseCny, parseTicketNo, refundPoints } from "@/lib/ticket-refund";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";
import WalletLayout from "../_components/WalletLayout";

interface Option { id: number; title: string; mode: "none" | "refund"; percent: number; maxPoints: number; refundedPoints: number }
interface Claim { id: number; exhibitionTitle: string; amountCny: number | null; status: string; hasInvoice: boolean; pointsAwarded: number | null; adminNote: string; createdAt: string }
interface Overview { exhibitions: Option[]; arrangedByUs: { id: number; title: string }[]; passportEnding: string; claims: Claim[] }

const TONE: Record<string, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger" };

// Train-ticket refund: pick the exhibition and send the receipt from the station. Our team gets the e-invoice from 12306
// (with the passport number on the buyer's profile), checks the amount and approves; the buyer can then download the e-invoice.
// A buyer who already has the invoice can add it with its amount.
export default function TicketRefundPage() {
  const t = useTranslations("buyerWallet");
  const tt = useTranslations("buyerWallet.ticket");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { expo: useId(), amount: useId(), ticketNo: useId() };
  const [data, setData] = useState<Overview | null>(null);
  const [exhibitionId, setExhibitionId] = useState("");
  const [receipt, setReceipt] = useState("");
  const [qrText, setQrText] = useState("");
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isBuyer = user?.role === "buyer";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestKey = useMemo(() => newClientKey(), [exhibitionId, receipt.length, invoice.length, amount, ticketNo]);

  const reload = useCallback(async () => {
    const res = await walletApi<Overview>("/api/wallet/ticket-refunds");
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setData(res.data);
    setExhibitionId((prev) => prev || (res.data.exhibitions[0] ? String(res.data.exhibitions[0].id) : ""));
  }, [t]);

  useEffect(() => {
    if (isBuyer) reload();
  }, [isBuyer, reload]);

  // The QR code on the receipt is read when the phone's browser can, and kept for our team; nothing depends on it.
  async function onReceipt(url: string) {
    setReceipt(url);
    setQrText(url ? ((await decodeQrFromDataUrl(url)) ?? "") : "");
  }

  const option = data?.exhibitions.find((x) => String(x.id) === exhibitionId);
  const amountCny = parseCny(amount);
  const amountOk = invoice ? amountCny !== null : amount.trim() === "" || amountCny !== null;
  const ticketNoValid = parseTicketNo(ticketNo) !== null;
  const estimate = option && amountCny !== null ? refundPoints(amountCny, { mode: option.mode, percent: option.percent, maxPoints: option.maxPoints }, option.refundedPoints) : null;
  // Our team needs the passport ending to get the e-invoice from 12306.
  const ready = !!option && !!receipt && amountOk && ticketNoValid && !!data?.passportEnding;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !option) return;
    setBusy(true);
    setError("");
    const res = await walletApi("/api/wallet/ticket-refunds", {
      method: "POST",
      body: { key: requestKey, exhibitionId: option.id, receipt, invoice, amount, ticketNo, qrText },
    });
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSent(true);
    setReceipt("");
    setInvoice("");
    setAmount("");
    setTicketNo("");
    setQrText("");
    reload();
  }

  return (
    <WalletLayout title={tt("title")} subtitle={tt("subtitle")} signInNext="/dashboard/buyer/wallet/ticket">
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {!data && !error && <p className="text-center text-gray-700">{t("loading")}</p>}
      {data && (
        <div className="space-y-6">
          {data.exhibitions.length === 0 ? (
            <Card shadow="sm" bordered={false} className="p-5 space-y-2" data-testid="ticket-none">
              <h2 className="font-bold text-heading">{tt("noneTitle")}</h2>
              <p className="text-gray-800">{tt("noneText")}</p>
              {data.arrangedByUs.length > 0 && <p className="text-sm text-gray-700">{tt("arranged", { names: data.arrangedByUs.map((x) => x.title).join(", ") })}</p>}
            </Card>
          ) : (
            <form onSubmit={submit} className="space-y-6" data-testid="ticket-form">
              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step1")}</h2>
                <div>
                  <label htmlFor={ids.expo} className="block text-sm font-medium text-gray-700 mb-1.5">{tt("expo")}</label>
                  <select id={ids.expo} value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} className={fieldClasses()}>
                    {data.exhibitions.map((x) => (
                      <option key={x.id} value={x.id}>{x.title}</option>
                    ))}
                  </select>
                </div>
                {option && (
                  <p className="text-sm text-gray-800" data-testid="ticket-rule">
                    {tt("rule", { percent: option.percent })}
                    {option.maxPoints > 0 && ` ${tt("ruleMax", { max: formatNumber(option.maxPoints), done: formatNumber(option.refundedPoints) })}`}
                  </p>
                )}
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step2")}</h2>
                <p className="text-sm text-gray-800">{tt("step2Help")}</p>
                <UploadField label={tt("receipt")} value={receipt} onChange={onReceipt} onError={setError} high invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step3")}</h2>
                <p className="text-sm text-gray-800">{tt("step3Help")}</p>
                {data.passportEnding ? (
                  <p className="rounded-lg bg-cream-50 px-3 py-2 text-lg font-extrabold tracking-wider text-heading" data-testid="ticket-passport">{tt("passportEnding", { ending: data.passportEnding })}</p>
                ) : (
                  <p className="text-sm text-gray-800" data-testid="ticket-passport-missing">
                    {tt("passportMissing")} <Link href="/dashboard/buyer/profile" className="inline-block py-1 font-semibold text-emerald-800 underline">{tt("openProfile")}</Link>
                  </p>
                )}
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step4")}</h2>
                <p className="text-sm text-gray-800">{tt("step4Help")}</p>
                <UploadField label={tt("invoice")} value={invoice} onChange={setInvoice} onError={setError} allowPdf invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
                <div>
                  <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{tt("amount")}</label>
                  <input id={ids.amount} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClasses(!amountOk)} placeholder="536.00" />
                  <p className="mt-1 text-xs text-gray-700">{tt("amountHint")}</p>
                </div>
                <div>
                  <label htmlFor={ids.ticketNo} className="block text-sm font-medium text-gray-700 mb-1.5">{tt("ticketNo")}</label>
                  <input id={ids.ticketNo} value={ticketNo} onChange={(e) => setTicketNo(e.target.value)} className={fieldClasses(!ticketNoValid)} />
                  <p className="mt-1 text-xs text-gray-700">{tt("ticketNoHint")}</p>
                </div>
                {estimate !== null && (
                  <p className="font-semibold text-heading" data-testid="ticket-estimate">{estimate > 0 ? tt("estimate", { points: formatNumber(estimate) }) : tt("estimateNone")}</p>
                )}
              </Card>

              {sent && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-green-900" data-testid="ticket-sent">{tt("sent")}</p>}
              <Button type="submit" variant="gradientCta" size="wide" disabled={busy || !ready} data-testid="ticket-submit">{busy ? tt("sending") : tt("submit")}</Button>
            </form>
          )}

          <div>
            <h2 className="text-xl font-bold text-heading">{tt("historyTitle")}</h2>
            {data.claims.length === 0 ? (
              <p className="mt-3 text-gray-700">{tt("historyEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="ticket-history">
                {data.claims.map((c) => (
                  <li key={c.id}>
                    <Card shadow="sm" bordered={false} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-heading [overflow-wrap:anywhere]">{c.amountCny === null ? c.exhibitionTitle : tt("historyRow", { expo: c.exhibitionTitle, amount: c.amountCny.toFixed(2) })}</span>
                        <span className="flex items-center gap-2">
                          {c.pointsAwarded !== null && <span className="text-sm font-bold text-green-800">{tt("points", { points: formatNumber(c.pointsAwarded) })}</span>}
                          <Badge tone={TONE[c.status] ?? "gray"}>{t(`status.${c.status}`)}</Badge>
                        </span>
                      </div>
                      {c.status === "pending" && <p className="mt-1 text-sm text-gray-800" data-testid={`ticket-stage-${c.id}`}>{c.hasInvoice ? tt("stageWaiting") : tt("stageGetting")}</p>}
                      {c.hasInvoice && <p className="mt-1"><a href={`/api/wallet/ticket-refunds/${c.id}/invoice`} download className="inline-block py-1 text-sm font-semibold text-emerald-800 underline" data-testid={`ticket-invoice-${c.id}`}>{tt("downloadInvoice")}</a></p>}
                      {c.adminNote && <p className="mt-1 text-sm text-gray-700 [overflow-wrap:anywhere]">{c.adminNote}</p>}
                      <p className="mt-1 text-xs text-gray-600">{formatInstantDateTime(c.createdAt, locale)}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WalletLayout>
  );
}
