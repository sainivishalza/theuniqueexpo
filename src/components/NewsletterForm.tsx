"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export default function NewsletterForm() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (!res.ok) throw new Error();
      setEmail("");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="w-full md:w-auto" onSubmit={onSubmit}>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status !== "sending") setStatus("idle"); }}
          aria-label={t("emailPlaceholder")}
          placeholder={t("emailPlaceholder")}
          className="flex-1 min-w-0 md:w-72 rounded-[var(--radius-button)] bg-[var(--color-footer-surface)] border border-[var(--color-footer-border)] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-[var(--radius-button)] bg-gold-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-gold-600 transition-colors whitespace-nowrap disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        >
          {t("subscribe")}
        </button>
      </div>
      <p role="status" aria-live="polite" className={`mt-2 text-sm min-h-5 ${status === "error" ? "text-red-300" : "text-gold-400"}`}>
        {status === "done" ? t("subscribeSuccess") : status === "error" ? t("subscribeError") : ""}
      </p>
    </form>
  );
}
