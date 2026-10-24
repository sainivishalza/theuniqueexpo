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
import { parseCny, parseTicketNo, qrLink, refundPoints } from "@/lib/ticket-refund";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";
import WalletLayout from "../_components/WalletLayout";

interface Option { id: number; title: string; mode: "none" | "refund"; percent: number; maxPoints: number; refundedPoints: number }
interface Claim { id: number; exhibitionTitle: string; amountCny: number | null; status: string; pointsAwarded: number | null; adminNote: string; createdAt: string }
interface Overview { exhibitions: Option[]; arrangedByUs: { id: number; title: string }[]; passportEnding: string; claims: Claim[] }

const TONE: Record<string, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger" };

// Train-ticket refund, step by step: pick the exhibition, add the station receipt (its QR code opens the 12306 page), get the
// e-invoice from 12306 with the last 6 characters of the passport number, upload it and the amount, and send it to be approved.
export default function TicketRefundPage() {
  const t = useTranslations("buyerWallet");
  const tt = useTranslations("buyerWallet.ticket");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { expo: useId(), amount: useId(), ticketNo: useId() };
  const [data, setData] = useState<Overview | null>(null);
  const [exhibitionId, setExhibitionId] = useState("");
  const [receipt, setReceipt] = useState("");
  const [qr, setQr] = useState<{ state: "idle" | "reading" | "found" | "failed"; text: string }>({ state: "idle", text: "" });
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function onReceipt(url: string) {
    setReceipt(url);
    setCopied(false);
    if (!url) {
      setQr({ state: "idle", text: "" });
      return;
    }
    setQr({ state: "reading", text: "" });
    const text = await decodeQrFromDataUrl(url);
    setQr(text ? { state: "found", text } : { state: "failed", text: "" });
  }

  const option = data?.exhibitions.find((x) => String(x.id) === exhibitionId);
  const amountCny = parseCny(amount);
  const ticketNoValid = parseTicketNo(ticketNo) !== null;
  const estimate = option && amountCny !== null ? refundPoints(amountCny, { mode: option.mode, percent: option.percent, maxPoints: option.maxPoints }, option.refundedPoints) : null;
  const ready = !!option && !!receipt && !!invoice && amountCny !== null && ticketNoValid;
  const link = qr.state === "found" ? qrLink(qr.text) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !option) return;
    setBusy(true);
    setError("");
    const res = await walletApi("/api/wallet/ticket-refunds", {
      method: "POST",
      body: { key: requestKey, exhibitionId: option.id, receipt, invoice, amount, ticketNo, qrText: qr.text },
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
    setQr({ state: "idle", text: "" });
    reload();
  }

  async function copyQr() {
    try {
      await navigator.clipboard.writeText(qr.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // the text is shown, so it can be copied by hand
    }
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
                {qr.state === "found" && (
                  <div className="space-y-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950" data-testid="ticket-qr-found">
                    <p className="font-semibold">{tt("qrFound")}</p>
                    {link && <p><a href={link} target="_blank" rel="noopener noreferrer" className="inline-block py-1 font-semibold underline">{tt("qrOpen")}</a></p>}
                    <p className="[overflow-wrap:anywhere]">{tt("qrText")} {qr.text}</p>
                    <Button type="button" variant="secondaryOutline" size="xs" onClick={copyQr}>{tt("copy")}</Button>
                    {copied && <span role="status" className="ml-2 text-green-800">{tt("copied")}</span>}
                  </div>
                )}
                {qr.state === "failed" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950" data-testid="ticket-qr-failed">{tt("qrFail")}</p>}
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
                <p className="text-sm text-gray-800">{tt("step3Download")}</p>
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step4")}</h2>
                <UploadField label={tt("invoice")} value={invoice} onChange={setInvoice} onError={setError} allowPdf invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
              </Card>

              <Card shadow="sm" bordered={false} className="p-5 space-y-3">
                <h2 className="font-bold text-heading">{tt("step5")}</h2>
                <div>
                  <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{tt("amount")}</label>
                  <input id={ids.amount} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClasses(amount !== "" && amountCny === null)} placeholder="536.00" />
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
                        <span className="font-semibold text-heading [overflow-wrap:anywhere]">{tt("historyRow", { expo: c.exhibitionTitle, amount: c.amountCny === null ? "" : c.amountCny.toFixed(2) })}</span>
                        <span className="flex items-center gap-2">
                          {c.pointsAwarded !== null && <span className="text-sm font-bold text-green-800">{tt("points", { points: formatNumber(c.pointsAwarded) })}</span>}
                          <Badge tone={TONE[c.status] ?? "gray"}>{t(`status.${c.status}`)}</Badge>
                        </span>
                      </div>
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
