"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { formatDateOnly, formatDateTime, STATUS_TONE } from "@/lib/client/registration-format";
import { MAX_ARRIVAL_NOTE_LENGTH, MAX_FEEDBACK_LENGTH, type MyRegistration } from "@/lib/registration-lifecycle";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Props {
  exhibitionSlug: string;
  /** What to show while the visitor has no registration (the "Register" call to action). */
  fallback?: ReactNode;
  registrationEnabled?: boolean;
  /** Called once the buyer's registration is known, so a parent page can react (e.g. open the edit form). */
  onLoaded?: (registration: MyRegistration | null) => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

// The buyer's own registration for one exhibition: where it stands, and the next
// step they can take (edit / cancel while waiting, confirm attendance once approved,
// check in at the venue, leave feedback afterwards).
export default function ExpoRegistrationStatus({ exhibitionSlug, fallback = null, registrationEnabled = true, onLoaded }: Props) {
  const t = useTranslations("expoRegistrationStatus");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [registration, setRegistration] = useState<MyRegistration | null | undefined>(undefined);
  const [buyerNumber, setBuyerNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [askCancel, setAskCancel] = useState(false);
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalNote, setArrivalNote] = useState("");
  const [ticket, setTicket] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const userId = user?.id;
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setRegistration(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/expo-registrations/mine?exhibition=${encodeURIComponent(exhibitionSlug)}&locale=${locale}`)
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((data) => {
        if (cancelled) return;
        setRegistration(data.registration || null);
        setBuyerNumber(data.buyerNumber || "");
        onLoaded?.(data.registration || null);
      })
      .catch(() => {
        if (!cancelled) setRegistration(null);
      });
    return () => {
      cancelled = true;
    };
    // onLoaded is intentionally left out: parents pass an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, exhibitionSlug, locale]);

  const send = useCallback(
    async (body: Record<string, unknown>, failureKey: "actionFailed" | "feedbackFailed" = "actionFailed") => {
      if (!registration) return false;
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/expo-registrations/${registration.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t(failureKey));
        // Reload through the localized endpoint so the exhibition title stays translated.
        const fresh = await fetch(`/api/expo-registrations/mine?exhibition=${encodeURIComponent(exhibitionSlug)}&locale=${locale}`).then((r) => r.json());
        setRegistration(fresh.registration || data.registration || null);
        return true;
      } catch (err) {
        setError(errorMessage(err, t(failureKey)));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [registration, exhibitionSlug, locale, t]
  );

  async function handleTicket(file: File | null) {
    setTicketError("");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setTicketError(t("confirm.fileTooLarge"));
      return;
    }
    try {
      setTicket(await readDocumentAsDataUrl(file));
    } catch {
      setTicketError(t("confirm.couldNotReadFile"));
    }
  }

  if (authLoading || registration === undefined || !registration) return <>{fallback}</>;

  const status = registration.status;
  const { actions } = registration;
  const expiredOn = formatDateOnly(registration.confirmBy, locale);

  return (
    <Card shadow="sm" className="p-6" aria-live="polite">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold text-heading">{t("title")}</h3>
        <Badge tone={STATUS_TONE[status] || "gray"} size="status">{t(`statusLabels.${status}`)}</Badge>
      </div>

      <p className="text-sm text-gray-600">{t(`messages.${status}`, { date: expiredOn })}</p>
      {status === "approved" && registration.confirmBy && (
        <p className="mt-2 text-sm font-semibold text-emerald-900">{t("confirmBy", { date: expiredOn })}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">{t("registeredOn", { date: formatDateTime(registration.createdAt, locale) })}</p>
      {buyerNumber && <p className="mt-1 text-xs text-gray-500">{t("registrationNumber")}: <span className="font-bold text-emerald-700">{buyerNumber}</span></p>}

      {/* Approved: confirm attendance */}
      {actions.confirm && (
        <form
          className="mt-5 space-y-4 border-t border-gray-100 pt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await send({ action: "confirm", arrivalDate: arrivalDate || undefined, arrivalNote: arrivalNote || undefined, docTicket: ticket || undefined });
          }}
        >
          <h4 className="font-bold text-heading">{t("confirm.heading")}</h4>
          <div>
            <label htmlFor="reg-arrival" className="block text-sm font-medium text-gray-700 mb-1">{t("confirm.arrivalDate")}</label>
            <input id="reg-arrival" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="reg-arrival-note" className="block text-sm font-medium text-gray-700 mb-1">{t("confirm.arrivalNote")}</label>
            <input id="reg-arrival-note" type="text" maxLength={MAX_ARRIVAL_NOTE_LENGTH} value={arrivalNote} onChange={(e) => setArrivalNote(e.target.value)}
              placeholder={t("confirm.arrivalNotePlaceholder")}
              className="w-full rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("confirm.ticket")}</span>
            <label className="cursor-pointer inline-block rounded-[var(--radius-button)] border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-cream-50 focus-within:outline focus-within:outline-2 focus-within:outline-emerald-900 focus-within:outline-offset-2">
              {ticket ? t("confirm.replaceFile") : t("confirm.chooseFile")}
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => handleTicket(e.target.files?.[0] || null)} />
            </label>
            {ticket && <span className="ml-2 text-xs text-emerald-700">{t("confirm.fileAttached")}</span>}
            {ticketError && <p className="mt-1 text-xs text-red-600">{ticketError}</p>}
          </div>
          <Button type="submit" disabled={busy} variant="gradientCta" size="block">
            {busy ? t("confirm.submitting") : t("confirm.submit")}
          </Button>
        </form>
      )}

      {/* Confirmed / attended: what they told us, and the check-in times */}
      {(status === "confirmed" || status === "attended") && (
        <dl className="mt-4 space-y-1 text-sm text-gray-600">
          {registration.arrivalDate && <div>{t("details.arrival", { date: formatDateOnly(registration.arrivalDate, locale) })}</div>}
          {registration.arrivalNote && <div className="[overflow-wrap:anywhere]">{t("details.note", { note: registration.arrivalNote })}</div>}
          {registration.hasTicket && <div>{t("details.ticketUploaded")}</div>}
          {registration.checkedInAt && <div>{t("details.checkedIn", { time: formatDateTime(registration.checkedInAt, locale) })}</div>}
          {registration.checkedOutAt && <div>{t("details.checkedOut", { time: formatDateTime(registration.checkedOutAt, locale) })}</div>}
        </dl>
      )}

      {/* After the show: feedback */}
      {actions.feedback && (
        <form
          className="mt-5 space-y-3 border-t border-gray-100 pt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await send({ action: "feedback", rating, comment: comment || undefined }, "feedbackFailed");
          }}
        >
          <h4 className="font-bold text-heading">{t("feedback.heading")}</h4>
          <div role="radiogroup" aria-label={t("feedback.rating")} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t("feedback.starsLabel", { count: n })}
                onClick={() => setRating(n)}
                className={`h-10 w-10 rounded-[var(--radius-button)] border text-xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${rating >= n ? "border-gold-500 bg-gold-100 text-gold-800" : "border-gray-200 text-gray-300"}`}
              >
                ★
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="reg-feedback" className="block text-sm font-medium text-gray-700 mb-1">{t("feedback.comment")}</label>
            <textarea id="reg-feedback" rows={3} maxLength={MAX_FEEDBACK_LENGTH} value={comment} onChange={(e) => setComment(e.target.value)}
              className="w-full resize-none rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <Button type="submit" disabled={busy || rating === 0} variant="gradientCta" size="block">
            {busy ? t("feedback.submitting") : t("feedback.submit")}
          </Button>
        </form>
      )}
      {registration.feedbackAt && (
        <div className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
          <p className="font-semibold text-heading">{t("feedback.thanks")}</p>
          <p aria-label={t("feedback.starsLabel", { count: registration.feedbackRating ?? 0 })}>
            {"★".repeat(registration.feedbackRating ?? 0)}
            <span className="text-gray-300">{"★".repeat(5 - (registration.feedbackRating ?? 0))}</span>
          </p>
          {registration.feedbackComment && <p className="mt-1 [overflow-wrap:anywhere]">{registration.feedbackComment}</p>}
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Edit / cancel / register again */}
      {(actions.edit || actions.cancel || (status === "cancelled" && registrationEnabled)) && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          {actions.edit && (
            <Link
              href={`/exhibitions/${exhibitionSlug}/register?edit=1`}
              className="rounded-[var(--radius-button)] border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2"
            >
              {t("editRegistration")}
            </Link>
          )}
          {actions.cancel && !askCancel && (
            <button type="button" onClick={() => setAskCancel(true)}
              className="text-sm font-semibold text-red-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 rounded-sm">
              {status === "confirmed" ? t("cancelAttendance") : t("cancelRegistration")}
            </button>
          )}
          {actions.cancel && askCancel && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("cancelAreYouSure")}>
              <span className="text-sm text-gray-700">{t("cancelAreYouSure")}</span>
              <Button type="button" variant="ghostDanger" size="compact" disabled={busy}
                onClick={async () => { if (await send({ action: "cancel" })) setAskCancel(false); }}>
                {busy ? t("cancelling") : t("cancelYes")}
              </Button>
              <Button type="button" variant="ghost" size="compact" disabled={busy} onClick={() => setAskCancel(false)}>{t("cancelKeep")}</Button>
            </div>
          )}
          {status === "cancelled" && registrationEnabled && (
            <Link
              href={`/exhibitions/${exhibitionSlug}/register`}
              className="rounded-[var(--radius-button)] gradient-brand px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2"
            >
              {t("registerAgain")}
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
