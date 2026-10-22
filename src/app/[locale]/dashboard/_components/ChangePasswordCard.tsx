"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password";

const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

// One password box with a Show / Hide button, so a mistyped password can be checked by eye.
function PasswordField({
  id, label, value, onChange, autoComplete, describedBy,
}: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; describedBy?: string }) {
  const t = useTranslations("accountPassword");
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          className={INPUT}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {shown ? t("hide") : t("show")}
        </button>
      </div>
    </div>
  );
}

const SERVER_ERRORS = ["wrong_password", "weak_password", "too_long", "mismatch", "same_password", "rate_limited", "unauthorized"];

// "Change password": the current password, the new one, and the new one again.
export default function ChangePasswordCard() {
  const t = useTranslations("accountPassword");
  const ids = { current: useId(), next: useId(), confirm: useId(), hint: useId() };
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function check(): string {
    if (!current) return t("errors.currentMissing");
    const problem = passwordProblem(next);
    if (problem) return t(`errors.${problem}`, { min: MIN_PASSWORD_LENGTH });
    if (next !== confirm) return t("errors.mismatch");
    if (next === current) return t("errors.same_password");
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    const problem = check();
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(SERVER_ERRORS.includes(data.code) ? t(`errors.${data.code}`, { min: MIN_PASSWORD_LENGTH }) : t("errors.generic"));
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="change-password" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <form onSubmit={submit} className="mt-4 grid max-w-md gap-4" noValidate>
        <PasswordField id={ids.current} label={t("current")} value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField id={ids.next} label={t("new")} value={next} onChange={setNext} autoComplete="new-password" describedBy={ids.hint} />
        <PasswordField id={ids.confirm} label={t("confirm")} value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <p id={ids.hint} className="-mt-2 text-xs text-gray-600">{t("hint", { min: MIN_PASSWORD_LENGTH })}</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {done && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{t("success")}</p>}
        <div>
          <Button type="submit" variant="save" size="compact" disabled={busy}>{busy ? t("saving") : t("submit")}</Button>
        </div>
      </form>
    </div>
  );
}
