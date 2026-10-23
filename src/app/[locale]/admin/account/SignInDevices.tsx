"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/client/registration-format";

interface Device { browser: string; ipPrefix: string; firstAt: string; lastAt: string; signIns: number }

// The browsers and places this admin has signed in from. A sign-in from somewhere new is also e-mailed to them.
export default function SignInDevices() {
  const t = useTranslations("adminSignIns");
  const locale = useLocale();
  const [devices, setDevices] = useState<Device[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/sign-ins", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { devices: [] }))
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => setDevices([]));
  }, []);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="sign-in-devices">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-700">{t("intro")}</p>
      {devices && devices.length === 0 && <p className="mt-3 text-sm text-gray-700">{t("none")}</p>}
      <ul className="mt-3 divide-y divide-gray-100 text-sm">
        {(devices ?? []).map((d) => (
          <li key={`${d.browser}-${d.ipPrefix}`} className="py-2" data-testid="sign-in-device">
            <p className="font-semibold text-heading">{d.browser}</p>
            <p className="text-xs text-gray-700">{t("place", { network: d.ipPrefix })}</p>
            <p className="text-xs text-gray-600">{t("seen", { last: formatDateTime(d.lastAt, locale), first: formatDateTime(d.firstAt, locale), count: d.signIns })}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
