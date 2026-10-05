"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Button from "@/components/ui/Button";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { GA_MEASUREMENT_ID_RE } from "@/lib/company-profile";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  clearAnalyticsCookies,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

// Owns the only optional cookies the site sets (Google Analytics): nothing
// loads until a visitor accepts, and the banner only exists when an
// Analytics ID is configured -- there's nothing to ask about otherwise.
export default function CookieConsent({ measurementId }: { measurementId: string }) {
  const t = useTranslations("cookieConsent");
  const pathname = usePathname();
  // undefined = saved choice not read yet (server render and first paint),
  // so nothing is rendered until the browser has actually checked.
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setChoice(readConsent());
  }, []);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  const enabled =
    GA_MEASUREMENT_ID_RE.test(measurementId) && !pathname.startsWith("/admin") && !pathname.startsWith("/dashboard");
  if (!enabled) return null;

  function decide(next: ConsentChoice) {
    saveConsent(next);
    setChoice(next);
    setReopened(false);
    // Google's documented switch for stopping a tag that's already loaded.
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = next === "denied";
    if (next === "denied") clearAnalyticsCookies();
  }

  const showBanner = choice !== undefined && (choice === null || reopened);

  return (
    <>
      {choice === "granted" && <GoogleAnalytics measurementId={measurementId} />}
      {showBanner && (
        <div
          role="region"
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl md:inset-x-auto md:bottom-5 md:left-5 md:max-w-md"
        >
          <h2 id="cookie-consent-title" className="text-base font-bold text-gray-900">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{t("body")}</p>
          <Link href="/cookies" className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline">
            {t("policyLink")}
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondaryOutline" size="block" onClick={() => decide("denied")}>
              {t("decline")}
            </Button>
            <Button type="button" variant="primary" size="block" onClick={() => decide("granted")}>
              {t("accept")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
