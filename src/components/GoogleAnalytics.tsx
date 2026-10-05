"use client";

import Script from "next/script";
import { usePathname } from "@/i18n/navigation";
import { GA_MEASUREMENT_ID_RE } from "@/lib/company-profile";

// Renders nothing until a GA4 ID is set -- in Admin -> Company Profile, or
// failing that NEXT_PUBLIC_GA_MEASUREMENT_ID in the server's .env.local.
// Skipped on /admin and /dashboard so staff activity doesn't skew the numbers.
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  if (!GA_MEASUREMENT_ID_RE.test(measurementId)) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
