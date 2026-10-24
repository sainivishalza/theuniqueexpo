"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPlaceholderEmail } from "@/lib/login-id";
import Button from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/FormField";

const SERVER_ERRORS = ["invalid_email", "same_email", "wrong_password", "rate_limited", "mail_off", "no_email", "unavailable"];

// "Change my e-mail address": the new address and the current password. A link is sent to the NEW address and
// the account keeps its current one until it is opened. Shown for an account that has a real address (an account
// without one adds its first on the profile page).
export default function ChangeEmailCard() {
  const t = useTranslations("accountChangeEmail");
  const { user } = useAuth();
  const ids = { email: useId(), password: useId() };
  const [mailOn, setMailOn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const applies = !!user && !isPlaceholderEmail(user.email);
  useEffect(() => {
    if (!applies) return;
    fetch("/api/auth/add-email")
      .then((r) => r.json())
      .then((d) => setMailOn(!!d.enabled))
      .catch(() => setMailOn(null));
  }, [applies]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError(t("errors.missing"));
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, currentPassword: password }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSentTo(email.trim());
        setPassword("");
        setEmail("");
      } else {
        setError(SERVER_ERRORS.includes(data.code) ? t(`errors.${data.code}`) : t("errors.generic"));
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!applies || !user) return null;
  return (
    <div id="change-email" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("current", { email: user.email })}</p>
      {mailOn === false ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("mailOff")}{" "}
          {user.role === "admin" && <Link href="/admin/email" className="py-1 font-semibold text-emerald-800 underline hover:text-emerald-900">{t("setUpEmail")}</Link>}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
          {sentTo && (
            <div role="status" className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-semibold">{t("sentTitle")}</p>
              <p className="mt-1">{t("sentBody", { email: sentTo })}</p>
            </div>
          )}
          <form onSubmit={submit} className="mt-4 grid max-w-md gap-4" noValidate>
            <div>
              <label htmlFor={ids.email} className="mb-1 block text-sm font-medium text-gray-700">{t("newEmail")}</label>
              <input id={ids.email} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.password} className="mb-1 block text-sm font-medium text-gray-700">{t("password")}</label>
              <input id={ids.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClasses()} />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <Button type="submit" variant="save" size="compact" disabled={busy}>{busy ? t("sending") : t("submit")}</Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
