"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
const KNOWN_ERRORS = ["wrong_password", "wrong_code", "wrong_password_or_code", "rate_limited", "already_on", "not_on", "unauthorized"];

type Step = "loading" | "off" | "password" | "scan" | "codes" | "on" | "newCodes" | "turnOff";

// Two-step sign-in for the signed-in admin: a 6-digit code from an authenticator app after the password.
export default function TwoStepCard() {
  const t = useTranslations("adminTwoStep");
  const ids = { password: useId(), code: useId() };
  const [step, setStep] = useState<Step>("loading");
  const [left, setLeft] = useState(0);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/two-step")
      .then((r) => r.json())
      .then((d) => {
        setLeft(d.recoveryCodesLeft ?? 0);
        setStep(d.enabled ? "on" : "off");
      })
      .catch(() => setStep("off"));
  }, []);

  async function call(body: Record<string, string>): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/two-step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(KNOWN_ERRORS.includes(data.code) ? t(`errors.${data.code}`) : t("errors.generic"));
        return null;
      }
      return data;
    } catch {
      setError(t("errors.generic"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function reset(next: Step) {
    setPassword("");
    setCode("");
    setError("");
    setStep(next);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const data = await call({ action: "start", password });
    if (!data) return;
    setSetup({ secret: String(data.secret), qr: String(data.qr) });
    setPassword("");
    setStep("scan");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    const data = await call({ action: "confirm", code });
    if (!data) return;
    setCodes(data.recoveryCodes as string[]);
    setLeft((data.recoveryCodes as string[]).length);
    setSetup(null);
    setCode("");
    setStep("codes");
  }

  async function newCodes(e: React.FormEvent) {
    e.preventDefault();
    const data = await call({ action: "recoveryCodes", password });
    if (!data) return;
    setCodes(data.recoveryCodes as string[]);
    setLeft((data.recoveryCodes as string[]).length);
    setPassword("");
    setStep("codes");
  }

  async function turnOff(e: React.FormEvent) {
    e.preventDefault();
    const data = await call({ action: "disable", password, code });
    if (!data) return;
    reset("off");
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const passwordField = (
    <div>
      <label htmlFor={ids.password} className="mb-1 block text-sm font-medium text-gray-700">{t("password")}</label>
      <input id={ids.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} required />
    </div>
  );
  const codeField = (label: string, hint?: string) => (
    <div>
      <label htmlFor={ids.code} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input id={ids.code} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={hint ? 16 : 7} value={code} onChange={(e) => setCode(e.target.value)} className={INPUT} placeholder={hint ?? "123456"} required />
    </div>
  );
  const errorBox = error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;

  return (
    <div id="two-step" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-bold text-heading">{t("title")}</h2>
        {step !== "loading" && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${["on", "newCodes", "turnOff", "codes"].includes(step) ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
            {["on", "newCodes", "turnOff", "codes"].includes(step) ? t("statusOn") : t("statusOff")}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>

      {step === "off" && (
        <div className="mt-4">
          <Button type="button" variant="save" size="compact" onClick={() => reset("password")}>{t("turnOn")}</Button>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={start} className="mt-4 grid max-w-md gap-4">
          <p className="text-sm text-gray-700">{t("passwordFirst")}</p>
          {passwordField}
          {errorBox}
          <div className="flex gap-3">
            <Button type="submit" variant="save" size="compact" disabled={busy}>{t("continue")}</Button>
            <Button type="button" variant="ghost" size="compact" onClick={() => reset("off")}>{t("cancel")}</Button>
          </div>
        </form>
      )}

      {step === "scan" && setup && (
        <form onSubmit={confirm} className="mt-4 grid max-w-md gap-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>{t("scan1")}</li>
            <li>{t("scan2")}</li>
            <li>{t("scan3")}</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt={t("qrAlt")} width={200} height={200} className="rounded-lg border border-gray-200 bg-white" />
          <div>
            <p className="text-xs text-gray-600">{t("cannotScan")}</p>
            <p className="mt-1 break-all font-mono text-sm font-bold tracking-wider text-gray-900" data-testid="two-step-secret">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
          </div>
          {codeField(t("codeLabel"))}
          {errorBox}
          <div className="flex gap-3">
            <Button type="submit" variant="save" size="compact" disabled={busy}>{t("confirmAndTurnOn")}</Button>
            <Button type="button" variant="ghost" size="compact" onClick={() => { setSetup(null); reset("off"); }}>{t("cancel")}</Button>
          </div>
        </form>
      )}

      {step === "codes" && (
        <div className="mt-4 max-w-md space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{t("codesWarning")}</p>
          <ul className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm font-bold text-gray-900" aria-label={t("codesTitle")}>
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondaryOutline" size="compact" onClick={copyCodes}>{t("copyCodes")}</Button>
            {copied && <span role="status" className="text-sm font-semibold text-green-800">{t("copied")}</span>}
            <Button type="button" variant="save" size="compact" onClick={() => { setCodes([]); setCopied(false); reset("on"); }}>{t("savedThem")}</Button>
          </div>
        </div>
      )}

      {step === "on" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-700">{t("onBody")}</p>
          <p className="text-sm text-gray-700">{t("codesLeft", { count: left })}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondaryOutline" size="compact" onClick={() => reset("newCodes")}>{t("newCodes")}</Button>
            <Button type="button" variant="ghostDanger" size="compact" onClick={() => reset("turnOff")}>{t("turnOff")}</Button>
          </div>
        </div>
      )}

      {step === "newCodes" && (
        <form onSubmit={newCodes} className="mt-4 grid max-w-md gap-4">
          <p className="text-sm text-gray-700">{t("newCodesBody")}</p>
          {passwordField}
          {errorBox}
          <div className="flex gap-3">
            <Button type="submit" variant="save" size="compact" disabled={busy}>{t("newCodes")}</Button>
            <Button type="button" variant="ghost" size="compact" onClick={() => reset("on")}>{t("cancel")}</Button>
          </div>
        </form>
      )}

      {step === "turnOff" && (
        <form onSubmit={turnOff} className="mt-4 grid max-w-md gap-4">
          <p className="text-sm text-gray-700">{t("turnOffBody")}</p>
          {passwordField}
          {codeField(t("codeOrRecovery"), "123456")}
          {errorBox}
          <div className="flex gap-3">
            <Button type="submit" variant="ghostDanger" size="compact" disabled={busy}>{t("turnOff")}</Button>
            <Button type="button" variant="ghost" size="compact" onClick={() => reset("on")}>{t("cancel")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
