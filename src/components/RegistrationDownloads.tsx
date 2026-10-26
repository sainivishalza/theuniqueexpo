"use client";

import { useEffect, useState } from "react";
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
  // The ticket shown big on the screen, for the person at the entrance to scan
  const [showing, setShowing] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  // The cursor goes into the screen when it opens and back to its button when it closes.
  const openId = `show-ticket-${registration.id}`;
  const closeId = `close-ticket-${registration.id}`;
  useEffect(() => {
    if (showing) document.getElementById(closeId)?.focus();
  }, [showing, closeId]);

  function closeShow() {
    setShowing(false);
    document.getElementById(openId)?.focus();
  }

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
            <Button id={openId} type="button" variant="gradientCta" size="compact" className="mt-2 ml-0 sm:ml-2" onClick={() => { setQrFailed(false); setShowing(true); }} data-testid="show-ticket">
              <span aria-hidden="true">📱 </span>{t("showButton")}
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
      {showing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("showTitle")}
          onKeyDown={(e) => e.key === "Escape" && closeShow()}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-white p-4 text-center"
          data-testid="ticket-screen"
        >
          <p className="text-lg font-extrabold text-heading [overflow-wrap:anywhere]">{registration.exhibitionTitle}</p>
          {qrFailed ? (
            <p role="alert" className="text-red-700">{t("errors.failed")}</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/expo-registrations/${registration.id}/ticket/qr`} alt={t("showAlt")} width={360} height={360} onError={() => setQrFailed(true)} className="h-auto w-full max-w-[22rem] bg-white" data-testid="ticket-qr" />
          )}
          <p className="max-w-sm text-sm text-gray-700">{t("showHint")}</p>
          <Button id={closeId} type="button" variant="secondaryOutline" size="compact" onClick={closeShow} data-testid="ticket-screen-close">{t("showClose")}</Button>
        </div>
      )}
    </div>
  );
}
