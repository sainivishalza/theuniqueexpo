"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi, walletCodeFromText } from "@/lib/client/wallet-client";
import { newClientKey } from "@/lib/wallet";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import WalletLayout from "../_components/WalletLayout";

type Target = { code: string } | { number: string };
interface Recipient { name: string; buyerNumber: string }

// Minimal typing for the browser's built-in QR reader (not in TypeScript's lib yet).
interface BarcodeReader { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }
declare global {
  interface Window { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeReader }
}

export default function SendPointsPage() {
  const t = useTranslations("buyerWallet");
  const { user } = useAuth();
  const ids = { number: useId(), amount: useId(), note: useId(), password: useId() };

  const [target, setTarget] = useState<Target | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [numberText, setNumberText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ balance: number; amount: number; name: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [signInNext, setSignInNext] = useState("/dashboard/buyer/wallet/send");

  const isBuyer = user?.role === "buyer";
  const amount = pointsFromText(amountText);

  // One request key per distinct payment: pressing Send twice, or retrying after a lost
  // connection, is the same payment; changing who, how much or the note starts a new one.
  const targetId = target ? ("code" in target ? target.code : target.number) : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestKey = useMemo(() => newClientKey(), [targetId, amountText, note]);

  async function lookup(next: Target) {
    setError("");
    setRecipient(null);
    setTarget(null);
    const query = "code" in next ? `code=${encodeURIComponent(next.code)}` : `number=${encodeURIComponent(next.number)}`;
    const res = await walletApi<Recipient>(`/api/wallet/recipient?${query}`);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setRecipient({ name: res.data.name, buyerNumber: res.data.buyerNumber });
    setTarget(next);
  }

  // Opened from someone's QR code: ?to=<code>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    setSignInNext(`/dashboard/buyer/wallet/send${to ? `?to=${encodeURIComponent(to)}` : ""}`);
    if (!isBuyer || !to) return;
    const code = walletCodeFromText(to);
    if (code) lookup({ code });
    else setError(t("errors.recipient_not_found"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyer]);

  // ----- scanning with the camera (where the browser can read QR codes) -----
  const videoRef = useRef<HTMLVideoElement>(null);
  // Known only in the browser (null until then, so server and browser render the same).
  const [canScan, setCanScan] = useState<boolean | null>(null);
  useEffect(() => {
    setCanScan(!!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia);
  }, []);
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const reader = new window.BarcodeDetector!({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await reader.detect(video);
            const code = found[0] ? walletCodeFromText(found[0].rawValue) : null;
            if (code) {
              setScanning(false);
              lookup({ code });
              return;
            }
          } catch {
            // keep trying
          }
          setTimeout(tick, 300);
        };
        tick();
      } catch {
        setScanning(false);
        setError(t("scanFailed"));
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function send() {
    if (!target || amount === null || busy) return;
    setBusy(true);
    setError("");
    const res = await walletApi<{ balance: number }>("/api/wallet/transfer", {
      method: "POST",
      body: { to: target, amount, note, key: requestKey, password },
    });
    setBusy(false);
    setPassword("");
    if (!res.ok) {
      setReviewing(false);
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setDone({ balance: res.data.balance, amount, name: recipient?.name || "" });
  }

  function again() {
    setDone(null);
    setTarget(null);
    setRecipient(null);
    setAmountText("");
    setNote("");
    setReviewing(false);
    setNumberText("");
  }

  const canReview = !!target && amount !== null && password.length > 0;

  return (
    <WalletLayout title={t("send.title")} subtitle={t("send.subtitle")} signInNext={signInNext}>
      {done ? (
        <Card shadow="sm" bordered={false} className="p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">✅</div>
          <h2 role="status" className="text-xl font-bold text-heading">{t("send.doneTitle", { points: formatNumber(done.amount), name: done.name })}</h2>
          <p className="mt-1 text-gray-600">{t("send.newBalance", { points: formatNumber(done.balance) })}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" variant="secondaryOutline" size="wide" onClick={again}>{t("send.sendMore")}</Button>
            <Button href="/dashboard/buyer/wallet" variant="gradientCta" size="wide">{t("send.backToWallet")}</Button>
          </div>
        </Card>
      ) : (
        <Card shadow="sm" bordered={false} className="p-6 space-y-5">
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {!recipient ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-heading">{t("send.whoTitle")}</h2>
              <p className="text-sm text-gray-600">{t("send.whoHint")}</p>
              {canScan && (
                <div>
                  {scanning ? (
                    <div>
                      <video ref={videoRef} playsInline muted className="w-full max-w-sm rounded-lg bg-black" aria-label={t("send.cameraLabel")} />
                      <Button type="button" variant="ghost" size="compact" className="mt-2" onClick={() => setScanning(false)}>{t("send.stopScan")}</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="secondaryOutline" size="wide" onClick={() => { setError(""); setScanning(true); }}>📷 {t("send.scan")}</Button>
                  )}
                </div>
              )}
              {canScan === false && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{t("send.scanUnsupported")}</p>}
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (numberText.trim()) lookup({ number: numberText.trim() });
                }}
              >
                <div className="min-w-[14rem] flex-1">
                  <label htmlFor={ids.number} className="block text-sm font-medium text-gray-700 mb-1.5">{t("send.buyerNumber")}</label>
                  <input id={ids.number} value={numberText} onChange={(e) => setNumberText(e.target.value)} placeholder="TUE0042" autoComplete="off" className={fieldClasses()} />
                </div>
                <Button type="submit" variant="gradientCta" size="wide" disabled={!numberText.trim()}>{t("send.find")}</Button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-900/20 bg-cream-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-900">{t("send.sendingTo")}</p>
                  <p className="text-lg font-bold text-heading">{recipient.name}</p>
                  <p className="text-sm text-gray-700">{recipient.buyerNumber}</p>
                </div>
                <Button type="button" variant="ghost" size="xs" onClick={again}>{t("send.change")}</Button>
              </div>

              {!reviewing ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canReview) setReviewing(true);
                  }}
                >
                  <div>
                    <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{t("send.amount")}</label>
                    <input id={ids.amount} inputMode="numeric" value={amountText} onChange={(e) => setAmountText(e.target.value)} autoComplete="off" className={fieldClasses(amountText !== "" && amount === null)} />
                    <p className="mt-1 text-xs text-gray-600">{t("send.amountHint")}</p>
                  </div>
                  <div>
                    <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("send.note")}</label>
                    <input id={ids.note} value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} autoComplete="off" className={fieldClasses()} />
                  </div>
                  <div>
                    <label htmlFor={ids.password} className="block text-sm font-medium text-gray-700 mb-1.5">{t("send.password")}</label>
                    <input id={ids.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={fieldClasses()} />
                    <p className="mt-1 text-xs text-gray-600">{t("send.passwordHint")}</p>
                  </div>
                  <Button type="submit" variant="gradientCta" size="blockMd" disabled={!canReview}>{t("send.review")}</Button>
                </form>
              ) : (
                <div className="space-y-4" role="group" aria-label={t("send.confirmTitle")}>
                  <h2 className="text-lg font-bold text-heading">{t("send.confirmTitle")}</h2>
                  <p className="text-gray-800">{t("send.confirmText", { points: formatNumber(amount ?? 0), name: recipient.name, number: recipient.buyerNumber })}</p>
                  <p className="text-sm text-gray-600">{t("send.confirmWarning")}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="gradientCta" size="wide" onClick={send} disabled={busy}>{busy ? t("sending") : t("send.confirmButton")}</Button>
                    <Button type="button" variant="ghost" size="wide" onClick={() => setReviewing(false)} disabled={busy}>{t("send.edit")}</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </WalletLayout>
  );
}
