"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Button, { type ButtonVariant, type ButtonSize } from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";
import { errorMessage } from "@/lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TripInquiryButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  attendingType?: "in_china" | "traveling" | "unspecified";
  tourType?: string;
  exhibitionSlug?: string;
  /** Short line shown under the modal title, e.g. an exhibition title or tour-type name. */
  context?: string;
}

// Reusable "Plan My Trip" / "Request a Quote" / "Get Local Assistance"
// trigger -- a button that opens a public, no-login lead-capture modal
// posting to /api/business-trip-inquiries. Used across the homepage,
// exhibitions listing/detail pages, and the Business Tours page so every
// enquiry entry point shares one form and one backend table.
export default function TripInquiryButton({
  label,
  variant = "gradientCta",
  size = "block",
  className = "",
  attendingType = "unspecified",
  tourType = "",
  exhibitionSlug = "",
  context,
}: TripInquiryButtonProps) {
  const t = useTranslations("tripInquiryModal");
  const tv = useTranslations("formValidation");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });

  function close() {
    setOpen(false);
    setSubmitted(false);
    setError("");
    setFieldErrors({});
    setForm({ name: "", email: "", phone: "", company: "", message: "" });
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/business-trip-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attendingType, tourType, exhibitionSlug }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("submitFailed"));
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, t("submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={close}>
          <div
            className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card-lg)] w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 className="text-xl font-bold text-heading">{t("title")}</h3>
                {context && <p className="mt-1 text-sm text-gray-500">{context}</p>}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="shrink-0 text-gray-400 hover:text-gray-700 text-xl leading-none p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm"
              >
                ×
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-700 font-semibold">{t("successTitle")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("successSubtitle")}</p>
                <Button type="button" variant="secondaryOutline" size="wide" className="mt-6" onClick={close}>
                  {t("close")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label={t("name")} htmlFor="ti-name" error={fieldErrors.name}>
                  <input
                    id="ti-name"
                    className={fieldClasses(!!fieldErrors.name)}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </FormField>
                <FormField label={t("email")} htmlFor="ti-email" error={fieldErrors.email}>
                  <input
                    id="ti-email"
                    type="email"
                    className={fieldClasses(!!fieldErrors.email)}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </FormField>
                <FormField label={t("phone")} htmlFor="ti-phone">
                  <input
                    id="ti-phone"
                    className={fieldClasses()}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </FormField>
                <FormField label={t("company")} htmlFor="ti-company">
                  <input
                    id="ti-company"
                    className={fieldClasses()}
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </FormField>
                <FormField label={t("message")} htmlFor="ti-message">
                  <textarea
                    id="ti-message"
                    rows={3}
                    className={fieldClasses()}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </FormField>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" variant="gradientCta" size="block" disabled={submitting}>
                  {submitting ? t("submitting") : t("submit")}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
