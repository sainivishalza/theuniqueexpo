"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateOnly, formatDateTime } from "@/lib/client/registration-format";
import QrCameraScanner, { cameraAvailable } from "@/components/QrCameraScanner";
import { ticketCodeFromScan } from "@/lib/ticket-scan";
import { readQrFromFile } from "@/lib/client/qr-reader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fieldClasses } from "@/components/ui/FormField";

interface Ticket {
  id: number;
  name: string;
  company: string;
  nationality: string;
  buyerNumber: string;
  exhibitionTitle: string;
  exhibitionStart: string;
  exhibitionEnd: string;
  status: string;
  checkedInAt: string | null;
  canCheckIn: boolean;
  doorAttended: number;
  doorExpected: number;
}

// The page an e-ticket's QR code opens for venue staff: who the ticket belongs to, and a button to let them in.
function TicketCheck() {
  const t = useTranslations("adminTicketCheck");
  const tr = useTranslations("adminRegistrationsCommon");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [problem, setProblem] = useState<"invalid_code" | "failed" | null>(null);
  const [message, setMessage] = useState<"checked_in" | "already_checked_in" | "not_confirmed" | null>(null);
  const [busy, setBusy] = useState(false);
  // The camera: known only in the browser (null until then, so the server and the browser render the same)
  const [canScan, setCanScan] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProblem, setScanProblem] = useState<"denied" | "failed" | "photo" | "foreign" | null>(null);
  useEffect(() => setCanScan(cameraAvailable()), []);

  const look = useCallback(async (value: string) => {
    setTicket(null);
    setMessage(null);
    setProblem(null);
    if (!value.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tickets/check?code=${encodeURIComponent(value.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setTicket(data.ticket);
      else setProblem(data.code === "invalid_code" ? "invalid_code" : "failed");
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const fromLink = params.get("code");
  useEffect(() => {
    if (user?.role === "admin" && fromLink) look(fromLink);
  }, [user, fromLink, look]);

  // A photo of the QR code (the phone's own camera app takes it, sharp and in focus): read it the same way.
  async function fromPhoto(file: File | undefined) {
    if (!file) return;
    setScanProblem(null);
    setScanning(false);
    setBusy(true);
    const text = await readQrFromFile(file);
    setBusy(false);
    if (text && ticketCodeFromScan(text)) scanned(text);
    else setScanProblem(text ? "foreign" : "photo");
  }

  function scanned(text: string) {
    setScanning(false);
    const found = ticketCodeFromScan(text);
    setCode(found);
    look(found);
  }

  async function letIn() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/tickets/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (data.ticket) setTicket(data.ticket);
      if (res.ok) setMessage("checked_in");
      else if (data.code === "already_checked_in" || data.code === "not_confirmed") setMessage(data.code);
      else setProblem("failed");
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-2xl px-6">
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-10 bg-cream-50 min-h-[50vh]">
        <div className="mx-auto max-w-2xl px-6 space-y-5">
          {canScan && (
            <div>
              {scanning ? (
                <div>
                  <QrCameraScanner onScan={scanned} accept={(text) => ticketCodeFromScan(text) !== ""} slowHint={t("slowHint")} onRejected={() => setScanProblem("foreign")} onError={(reason) => { setScanning(false); setScanProblem(reason); }} label={t("cameraLabel")} className="w-full rounded-lg bg-black" />
                  <p className="mt-2 text-sm text-gray-700">{t("scanning")}</p>
                  <Button type="button" variant="secondaryOutline" size="compact" className="mt-2" onClick={() => setScanning(false)}>{t("stopScan")}</Button>
                </div>
              ) : (
                <Button type="button" variant="gradientCta" size="block" onClick={() => { setScanProblem(null); setTicket(null); setMessage(null); setProblem(null); setScanning(true); }} data-testid="scan-ticket">📷 {ticket || problem ? t("scanNext") : t("scan")}</Button>
              )}
            </div>
          )}
          <div>
            <label htmlFor="ticket-photo" className="inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-[var(--radius-button)] border border-emerald-900 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-900">
              {t("photo")}
              <input id="ticket-photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { fromPhoto(e.target.files?.[0]); e.target.value = ""; }} data-testid="ticket-photo" />
            </label>
            <p className="mt-1 text-xs text-gray-600">{t("photoHint")}</p>
          </div>
          {scanProblem && <p role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="scan-problem">{t(`scanProblems.${scanProblem}`)}</p>}
          {canScan === false && <p className="rounded-[var(--radius-button)] bg-white px-3 py-2 text-sm text-gray-700">{t("scanUnsupported")}</p>}
          <form onSubmit={(e) => { e.preventDefault(); look(code); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="ticket-code" className="mb-1.5 block text-sm font-medium text-gray-700">{t("codeLabel")}</label>
              <input id="ticket-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} className={fieldClasses()} />
            </div>
            <Button type="submit" variant="save" size="compact" disabled={busy || !code.trim()}>{t("look")}</Button>
          </form>

          {problem && <p role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t(`problems.${problem}`)}</p>}

          {ticket && (
            <Card shadow="sm" className="p-6" data-testid="ticket-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {ticket.buyerNumber && <p className="text-xs font-bold tracking-wide text-emerald-700">{ticket.buyerNumber}</p>}
                  <h2 className="text-xl font-extrabold text-heading [overflow-wrap:anywhere]">{ticket.name}</h2>
                  {ticket.company && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{ticket.company}</p>}
                  {ticket.nationality && <p className="text-sm text-gray-500">{ticket.nationality}</p>}
                </div>
                <span className={`rounded-lg px-2 py-1 text-xs font-bold ${ticket.status === "confirmed" || ticket.status === "attended" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{tr(`statuses.${ticket.status}`)}</span>
              </div>
              <p className="mt-3 text-sm text-gray-700 [overflow-wrap:anywhere]">
                {ticket.exhibitionTitle} · {formatDateOnly(ticket.exhibitionStart, locale)}
                {ticket.exhibitionEnd && ticket.exhibitionEnd !== ticket.exhibitionStart ? ` – ${formatDateOnly(ticket.exhibitionEnd, locale)}` : ""}
              </p>
              <p className="mt-2 text-sm text-gray-700" data-testid="door-count">{t("doorCount", { attended: ticket.doorAttended, expected: ticket.doorExpected })}</p>
              {ticket.checkedInAt && <p className="mt-2 text-sm font-semibold text-emerald-900">{t("checkedInAt", { time: formatDateTime(ticket.checkedInAt, locale) })}</p>}
              {message && <p role="status" className={`mt-3 text-sm font-semibold ${message === "checked_in" ? "text-emerald-900" : "text-amber-800"}`}>{t(`messages.${message}`)}</p>}
              {ticket.canCheckIn && (
                <Button type="button" variant="gradientCta" size="block" className="mt-4" disabled={busy} onClick={letIn}>{busy ? t("checkingIn") : t("letIn")}</Button>
              )}
              {!ticket.canCheckIn && !ticket.checkedInAt && ticket.status !== "attended" && <p className="mt-3 text-sm text-gray-600">{t("cannotCheckIn")}</p>}
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

export default function TicketCheckPage() {
  return (
    <Suspense fallback={null}>
      <TicketCheck />
    </Suspense>
  );
}
