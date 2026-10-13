"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

// Shown instead of a blank/crashed page when something throws while
// rendering. Sits inside the site layout, so the nav and footer stay usable.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <section role="alert" className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold-600">{t("code")}</p>
      <h1 className="mt-3 text-3xl font-extrabold text-heading md:text-4xl">{t("heading")}</h1>
      <p className="mt-4 text-gray-600">{t("body")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-gold-500 px-6 py-3 text-sm font-semibold text-emerald-950 hover:bg-gold-600"
        >
          {t("retry")}
        </button>
        <Button href="/" variant="secondaryOutline">{t("home")}</Button>
      </div>
    </section>
  );
}
