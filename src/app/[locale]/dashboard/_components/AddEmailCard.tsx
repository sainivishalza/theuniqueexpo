"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { isPlaceholderEmail } from "@/lib/login-id";
import Button from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/FormField";

// For an account with no real e-mail address (a buyer imported from an expo sheet, who signs in with a
// phone or passport number): add one, confirm it from a link sent there, and from then on get password
// reset links and notifications. Shown only while the account has no real address and the site can send e-mail.
export default function AddEmailCard() {
  const t = useTranslations("accountEmail");
  const { user } = useAuth();
  const id = useId();
  const [state, setState] = useState<"checking" | "hidden" | "form" | "sent">("checking");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const wantsIt = !!user && isPlaceholderEmail(user.email);
  useEffect(() => {
    if (!wantsIt) {
      setState("hidden");
      return;
    }
    fetch("/api/auth/add-email")
      .then((r) => r.json())
      .then((d) => setState(d.needed && d.enabled ? "form" : "hidden"))
      .catch(() => setState("hidden"));
  }, [wantsIt]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/add-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSentTo(email.trim());
        setState("sent");
      } else {
        setError(["invalid_email", "rate_limited", "mail_off", "has_email"].includes(data.code) ? t(`errors.${data.code}`) : t("errors.generic"));
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || state === "hidden") return null;
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-gold-400 bg-white p-6 shadow-sm">
      <h2 id={`${id}-title`} className="font-bold text-heading">📧 {t("title")}</h2>
      {state === "sent" ? (
        <div role="status" className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">
          <p className="font-semibold">{t("sentTitle")}</p>
          <p className="mt-1">{t("sentBody", { email: sentTo })}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <p className="text-sm text-gray-700">{t("intro")}</p>
          <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{t("label")}</label>
            <input id={id} type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClasses()} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" variant="save" size="compact" disabled={busy}>{busy ? t("sending") : t("submit")}</Button>
        </form>
      )}
    </section>
  );
}
