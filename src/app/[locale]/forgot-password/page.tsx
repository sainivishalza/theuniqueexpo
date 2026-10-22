"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthPage from "@/components/auth/AuthPage";
import Button from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";

// "Forgot password?": type the e-mail address of the account and a link to choose a new password is sent.
export default function ForgotPasswordPage() {
  const t = useTranslations("authRecovery");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    fetch("/api/auth/forgot-password")
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSentTo(email.trim());
      else setError(data.code === "invalid_email" || data.code === "rate_limited" ? t(`forgot.errors.${data.code}`) : t("forgot.errors.generic"));
    } catch {
      setError(t("forgot.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage title={t("forgot.title")} intro={sentTo || enabled === false ? undefined : t("forgot.intro")}>
      {enabled === null ? null : enabled === false ? (
        <div className="rounded-[var(--radius-card)] border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>{t("forgot.unavailable")}</p>
        </div>
      ) : sentTo ? (
        <div role="status" className="rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{t("forgot.sentTitle")}</p>
          <p className="mt-1">{t("forgot.sentBody", { email: sentTo })}</p>
          <p className="mt-2 text-xs">{t("forgot.sentHint")}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <div role="alert" className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <FormField label={t("forgot.email")} htmlFor="forgot-email">
            <input id="forgot-email" required type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClasses()} />
          </FormField>
          <Button type="submit" disabled={busy} variant="primary" size="blockMd">{busy ? t("forgot.sending") : t("forgot.submit")}</Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-900 underline">{t("backToSignIn")}</Link>
      </p>
    </AuthPage>
  );
}
