"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { canGetInvitation, canGetTicket, type MyRegistration } from "@/lib/registration-lifecycle";
import Button from "@/components/ui/Button";

type Kind = "invitation" | "ticket";

// The two printable documents of a registration: the visa invitation letter (once approved) and the e-ticket /
// badge with its QR code (once attendance is confirmed). They are PDFs made by the server in English.
export default function RegistrationDownloads({ registration }: { registration: MyRegistration }) {
  const t = useTranslations("expoRegistrationStatus.downloads");
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<{ kind: Kind; code: string } | null>(null);

  const letter = canGetInvitation(registration.status);
  const ticket = canGetTicket(registration.status);
  if (!letter && !ticket) return null;

  async function download(kind: Kind) {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/expo-registrations/${registration.id}/${kind}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError({ kind, code: typeof data.code === "string" ? data.code : "failed" });
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind === "invitation" ? "invitation-letter" : "e-ticket"}-${registration.exhibitionSlug}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError({ kind, code: "failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-5" data-testid="registration-downloads">
      <h4 className="font-bold text-heading">{t("heading")}</h4>
      <div className="mt-3 space-y-4">
        {letter && (
          <div>
            <p className="text-sm text-gray-600">{t("invitationText")}</p>
            <Button type="button" variant="secondaryOutline" size="compact" className="mt-2" disabled={busy === "invitation"} onClick={() => download("invitation")}>
              <span aria-hidden="true">📄 </span>{busy === "invitation" ? t("preparing") : t("invitationButton")}
            </Button>
            {error?.kind === "invitation" && (
              <p role="alert" className="mt-2 rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {t(`errors.${["profile_incomplete", "not_available", "rate_limited"].includes(error.code) ? error.code : "failed"}`)}
                {error.code === "profile_incomplete" && (
                  <> <Link href="/dashboard/buyer/profile" className="font-semibold underline">{t("openProfile")}</Link></>
                )}
              </p>
            )}
          </div>
        )}
        {ticket && (
          <div>
            <p className="text-sm text-gray-600">{t("ticketText")}</p>
            <Button type="button" variant="secondaryOutline" size="compact" className="mt-2" disabled={busy === "ticket"} onClick={() => download("ticket")}>
              <span aria-hidden="true">🎫 </span>{busy === "ticket" ? t("preparing") : t("ticketButton")}
            </Button>
            {error?.kind === "ticket" && (
              <p role="alert" className="mt-2 rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {t(`errors.${["not_available", "rate_limited"].includes(error.code) ? error.code : "failed"}`)}
              </p>
            )}
          </div>
        )}
        {letter && !ticket && <p className="text-xs text-gray-500">{t("ticketLater")}</p>}
      </div>
    </div>
  );
}
