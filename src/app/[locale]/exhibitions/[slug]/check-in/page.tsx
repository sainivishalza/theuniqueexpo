"use client";
import { use, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { formatDateOnly, formatDateTime } from "@/lib/client/registration-format";
import type { MyRegistration } from "@/lib/registration-lifecycle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ExpoInfo { slug: string; title: string; dates: string }

const KNOWN_ERRORS = ["not_confirmed", "outside_dates", "already_done", "no_registration", "invalid_key"];

// Opened by scanning the exhibition's QR code at the venue. Nothing happens until
// the visitor presses a button, so a link preview or a second scan changes nothing.
export default function ExpoCheckInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("expoCheckIn");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [key, setKey] = useState<string | null>(null);
  const [expo, setExpo] = useState<ExpoInfo | null>(null);
  const [registration, setRegistration] = useState<MyRegistration | null | undefined>(undefined);
  const [invalidKey, setInvalidKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"checked_in" | "checked_out" | null>(null);

  useEffect(() => {
    setKey(new URLSearchParams(window.location.search).get("k") || "");
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (authLoading || !userId || key === null) return;
    let stale = false;
    fetch(`/api/expo-registrations/check-in?exhibition=${encodeURIComponent(slug)}&k=${encodeURIComponent(key)}&locale=${locale}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (stale) return;
        if (res.status === 403) setInvalidKey(true);
        else if (res.ok) {
          setExpo(data.exhibition);
          setRegistration(data.registration || null);
        } else setError(data.error || t("loadFailed"));
      })
      .catch(() => !stale && setError(t("loadFailed")));
    return () => {
      stale = true;
    };
  }, [authLoading, userId, slug, key, locale, t]);

  async function press(action: "check_in" | "check_out") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/expo-registrations/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exhibition: slug, k: key, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.registration) setRegistration(data.registration);
      if (res.ok) setDone(data.outcome);
      else setError(t(`errors.${KNOWN_ERRORS.includes(data.outcome) ? data.outcome : "generic"}`));
    } catch (err) {
      setError(errorMessage(err, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  }

  const shell = (body: React.ReactNode) => (
    <div className="min-h-[70vh] bg-cream-50 py-12">
      <div className="mx-auto max-w-md px-6">
        <Card shadow="sm" bordered={false} className="p-8 text-center">{body}</Card>
      </div>
    </div>
  );

  if (authLoading || key === null || (user && !invalidKey && !error && registration === undefined)) {
    return shell(<p className="text-gray-400">{t("loading")}</p>);
  }

  if (!key || invalidKey) {
    return shell(
      <>
        <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
        <h1 className="text-xl font-bold text-heading mb-2">{t("invalidTitle")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("invalidHint")}</p>
        <Button href={`/exhibitions/${slug}`} variant="gradientCta" size="block">{t("toExhibition")}</Button>
      </>
    );
  }

  if (!user) {
    const next = `/exhibitions/${slug}/check-in?k=${key}`;
    return shell(
      <>
        <div className="text-5xl mb-4" aria-hidden="true">📱</div>
        <h1 className="text-xl font-bold text-heading mb-2">{t("signInTitle")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("signInHint")}</p>
        <Button href={`/login?next=${encodeURIComponent(next)}`} variant="gradientCta" size="block">{t("signIn")}</Button>
      </>
    );
  }

  if (error && !registration) {
    return shell(<p role="alert" className="text-red-600">{error}</p>);
  }

  const title = expo?.title || "";
  if (!registration) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-heading mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("notRegistered")}</p>
        <Button href={`/exhibitions/${slug}/register`} variant="gradientCta" size="block">{t("registerNow")}</Button>
      </>
    );
  }

  const { status } = registration;
  let content: React.ReactNode;
  if (done === "checked_in" || (status === "attended" && !registration.checkedOutAt && done !== "checked_out")) {
    content = (
      <>
        <div className="text-5xl mb-3" aria-hidden="true">✅</div>
        <p className="font-semibold text-heading">{done === "checked_in" ? t("checkedInNow") : t("alreadyCheckedIn")}</p>
        <p className="mt-1 text-sm text-gray-500">{t("checkedInAt", { time: formatDateTime(registration.checkedInAt, locale) })}</p>
        {registration.canCheckOut && (
          <Button type="button" onClick={() => press("check_out")} disabled={busy} variant="gradientCta" size="block" className="mt-6">
            {busy ? t("working") : t("checkOut")}
          </Button>
        )}
      </>
    );
  } else if (status === "attended" && registration.checkedOutAt) {
    content = (
      <>
        <div className="text-5xl mb-3" aria-hidden="true">👋</div>
        <p className="font-semibold text-heading">{done === "checked_out" ? t("checkedOutNow") : t("alreadyCheckedOut")}</p>
        <p className="mt-1 text-sm text-gray-500">{t("checkedOutAt", { time: formatDateTime(registration.checkedOutAt, locale) })}</p>
        <Link href={`/exhibitions/${slug}`} className="mt-6 inline-block text-sm font-semibold text-emerald-700 hover:underline">{t("leaveFeedback")}</Link>
      </>
    );
  } else if (status === "confirmed" && registration.canCheckIn) {
    content = (
      <>
        <p className="text-sm text-gray-500 mb-6">{t("readyToCheckIn")}</p>
        <Button type="button" onClick={() => press("check_in")} disabled={busy} variant="gradientCta" size="block">
          {busy ? t("working") : t("checkIn")}
        </Button>
      </>
    );
  } else if (status === "confirmed") {
    content = <p className="text-sm text-gray-600">{t("opensOnShowDates", { start: formatDateOnly(registration.exhibitionStart, locale), end: formatDateOnly(registration.exhibitionEnd, locale) })}</p>;
  } else if (status === "approved") {
    content = (
      <>
        <p className="text-sm text-gray-600 mb-6">{t("confirmFirst")}</p>
        <Button href={`/exhibitions/${slug}`} variant="gradientCta" size="block">{t("confirmAttendance")}</Button>
      </>
    );
  } else {
    content = <p className="text-sm text-gray-600">{t(`blocked.${status}`)}</p>;
  }

  return shell(
    <>
      <h1 className="text-xl font-bold text-heading">{title}</h1>
      {expo?.dates && <p className="text-xs text-gray-400 mb-6">{expo.dates}</p>}
      {content}
      {error && <p role="alert" className="mt-4 rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </>
  );
}
