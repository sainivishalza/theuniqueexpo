"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthPage from "@/components/auth/AuthPage";
import PasswordInput from "@/components/auth/PasswordInput";
import Button from "@/components/ui/Button";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password";

const SERVER_ERRORS = ["weak_password", "too_long", "mismatch", "invalid_token", "rate_limited"];

function ResetForm() {
  const t = useTranslations("authRecovery");
  const token = useSearchParams().get("token") ?? "";
  const ids = { next: useId(), confirm: useId(), hint: useId() };
  const [valid, setValid] = useState<boolean | null>(null);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setValid(!!d.valid))
      .catch(() => setValid(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(next);
    if (problem) return setError(t(`reset.errors.${problem}`, { min: MIN_PASSWORD_LENGTH }));
    if (next !== confirm) return setError(t("reset.errors.mismatch"));
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: next, confirmPassword: confirm }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setNext("");
        setConfirm("");
      } else if (data.code === "invalid_token") {
        setValid(false);
      } else {
        setError(SERVER_ERRORS.includes(data.code) ? t(`reset.errors.${data.code}`, { min: MIN_PASSWORD_LENGTH }) : t("reset.errors.generic"));
      }
    } catch {
      setError(t("reset.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage title={t("reset.title")} intro={valid && !done ? t("reset.intro") : undefined}>
      {valid === null ? null : done ? (
        <div role="status" className="rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{t("reset.success")}</p>
          <p className="mt-3"><Button href="/login" variant="primary" size="blockMd">{t("reset.signIn")}</Button></p>
        </div>
      ) : !valid ? (
        <div role="alert" className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{t("reset.invalidTitle")}</p>
          <p className="mt-1">{t("reset.invalidBody")}</p>
          <p className="mt-3"><Link href="/forgot-password" className="font-semibold underline">{t("reset.requestNew")}</Link></p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <PasswordInput id={ids.next} label={t("reset.new")} value={next} onChange={setNext} autoComplete="new-password" showLabel={t("show")} hideLabel={t("hide")} describedBy={ids.hint} />
          <PasswordInput id={ids.confirm} label={t("reset.confirm")} value={confirm} onChange={setConfirm} autoComplete="new-password" showLabel={t("show")} hideLabel={t("hide")} />
          <p id={ids.hint} className="-mt-2 text-xs text-gray-600">{t("reset.hint", { min: MIN_PASSWORD_LENGTH })}</p>
          {error && <div role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" disabled={busy} variant="primary" size="blockMd">{busy ? t("reset.saving") : t("reset.submit")}</Button>
        </form>
      )}
      {!done && valid !== false && (
        <p className="mt-8 text-center text-sm">
          <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-900 underline">{t("backToSignIn")}</Link>
        </p>
      )}
    </AuthPage>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
