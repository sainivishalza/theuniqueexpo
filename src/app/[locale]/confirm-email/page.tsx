"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AuthPage from "@/components/auth/AuthPage";
import Button from "@/components/ui/Button";

function Confirm() {
  const t = useTranslations("authRecovery.confirm");
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done" | "taken">("checking");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/api/auth/confirm-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setState(d.valid ? "ready" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/confirm-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmail(String(data.email || ""));
        setState("done");
      } else setState(data.code === "email_taken" ? "taken" : "invalid");
    } catch {
      setState("invalid");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage title={t("title")} intro={state === "ready" ? t("intro") : undefined}>
      {state === "checking" ? null : state === "ready" ? (
        <Button onClick={confirm} disabled={busy} variant="primary" size="blockMd">{busy ? t("working") : t("button")}</Button>
      ) : state === "done" ? (
        <div role="status" className="rounded-[var(--radius-card)] border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{t("success")}</p>
          <p className="mt-1">{t("successBody", { email })}</p>
          <p className="mt-3"><Button href="/login" variant="primary" size="blockMd">{t("signIn")}</Button></p>
        </div>
      ) : (
        <div role="alert" className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{state === "taken" ? t("takenTitle") : t("invalidTitle")}</p>
          <p className="mt-1">{state === "taken" ? t("takenBody") : t("invalidBody")}</p>
          <p className="mt-3"><Link href="/dashboard" className="font-semibold underline">{t("backToAccount")}</Link></p>
        </div>
      )}
    </AuthPage>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <Confirm />
    </Suspense>
  );
}
