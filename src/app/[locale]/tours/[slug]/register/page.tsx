"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { validateCustomAnswers, type CustomFormField, type CustomFormSchema } from "@/lib/custom-registration-form";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";

interface Tour {
  id: string; slug: string; title: string; dates: string;
  registrationEnabled: boolean; registrationFormSchema: CustomFormSchema | null;
}

// Without this, a genuinely dead connection leaves the submit button
// spinning forever with no way out but reloading the page.
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default function TourRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("tourRegisterPage");
  const { slug } = use(params);
  const { user, loading: authLoading, setUser } = useAuth();
  const [tour, setTour] = useState<Tour | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [customFileErrors, setCustomFileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/tours/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTour(data.tour))
      .catch(() => setTour(null));
  }, [slug]);

  async function handleCustomFile(fieldId: string, file: File | null) {
    setCustomFileErrors((prev) => ({ ...prev, [fieldId]: "" }));
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setCustomFileErrors((prev) => ({ ...prev, [fieldId]: t("fileTooLarge") }));
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      setCustomAnswers((a) => ({ ...a, [fieldId]: dataUrl }));
    } catch {
      setCustomFileErrors((prev) => ({ ...prev, [fieldId]: t("couldNotReadFile") }));
    }
  }

  function toggleCustomCheckbox(fieldId: string, option: string) {
    setCustomAnswers((a) => {
      const current = Array.isArray(a[fieldId]) ? (a[fieldId] as string[]) : [];
      return {
        ...a,
        [fieldId]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent, schema: CustomFormSchema) {
    e.preventDefault();
    setError("");
    setAccountExists(false);
    const validationError = validateCustomAnswers(schema, customAnswers);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/tour-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourSlug: slug,
          customAnswers,
          ...(!user ? { email: accountEmail, fullName: accountName, password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.accountExists) setAccountExists(true);
        throw new Error(data.error || t("registrationFailed"));
      }
      if (data.user) setUser(data.user);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.name === "AbortError" ? t("timeoutError") : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (tour === undefined || authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }
  if (!tour) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
          <Link href="/tours" className="mt-4 inline-block text-emerald-600 hover:underline">{t("browseAll")}</Link>
        </div>
      </div>
    );
  }
  if (!tour.registrationEnabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("registrationClosed")}</h1>
          <p className="text-gray-500 mb-6">{t.rich("registrationClosedHint", { name: tour.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <Link href={`/tours/${tour.slug}`} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("backTo", { name: tour.title })}</Link>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("registrationSubmitted")}</h1>
          <p className="text-gray-500 mb-6">{t.rich("registrationSubmittedHint", { name: tour.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <Link href={`/tours/${tour.slug}`} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("backTo", { name: tour.title })}</Link>
        </div>
      </div>
    );
  }

  const schema = tour.registrationFormSchema || [];

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={`/tours/${tour.slug}`} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backTo", { name: tour.title })}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t("registerFor", { name: tour.title })}</h1>
        <p className="text-gray-500 mb-8">{t("datesLine", { dates: tour.dates })}</p>

        <form onSubmit={(e) => handleSubmit(e, schema)} className="space-y-6">
          {!user && (
            <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-gray-900">{t("yourAccount")}</h2>
              <p className="text-sm text-gray-500">{t("yourAccountHint")}</p>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField label={t("fullName")} required value={accountName} onChange={setAccountName} />
                <TextField label={t("email")} type="email" required value={accountEmail} onChange={setAccountEmail} />
                <TextField label={t("password")} type="password" required value={password} onChange={setPassword} placeholder={t("passwordPlaceholder")} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            {schema.map((field) => (
              <CustomField
                key={field.id}
                field={field}
                value={customAnswers[field.id]}
                onChange={(v) => setCustomAnswers((a) => ({ ...a, [field.id]: v }))}
                onToggleCheckbox={(option) => toggleCustomCheckbox(field.id, option)}
                onFile={(file) => handleCustomFile(field.id, file)}
                fileError={customFileErrors[field.id]}
              />
            ))}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}{" "}
              {accountExists && <Link href="/login" className="underline font-semibold">{t("signIn")}</Link>}
            </div>
          )}
          <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? t("submitting") : t("submitRegistration")}
          </button>
        </form>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && "*"}</label>
      <input required={required} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" />
    </div>
  );
}

function OptionGroup({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label} {required && "*"}</label>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((o) => (
          <label key={o} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-sm ${value === o ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
            <input type="radio" className="hidden" checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function CustomField({
  field, value, onChange, onToggleCheckbox, onFile, fileError,
}: {
  field: CustomFormField;
  value: unknown;
  onChange: (v: string) => void;
  onToggleCheckbox: (option: string) => void;
  onFile: (file: File | null) => void;
  fileError?: string;
}) {
  const t = useTranslations("tourRegisterPage");
  if (field.type === "text") {
    return <TextField label={field.label} required={field.required} value={(value as string) || ""} onChange={onChange} />;
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label} {field.required && "*"}</label>
        {field.helpText && <p className="text-xs text-gray-400 mb-1">{field.helpText}</p>}
        <textarea
          required={field.required}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none"
        />
      </div>
    );
  }

  if (field.type === "radio") {
    return <OptionGroup label={field.label} required={field.required} options={field.options || []} value={(value as string) || ""} onChange={onChange} />;
  }

  if (field.type === "checkbox") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{field.label} {field.required && "*"}</label>
        <div className="grid gap-2 md:grid-cols-2">
          {(field.options || []).map((o) => (
            <label key={o} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-sm ${selected.includes(o) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggleCheckbox(o)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // file
  const fileValue = (value as string) || "";
  const isImage = fileValue.startsWith("data:image");
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label} {field.required && "*"}</label>
      {fileValue && (isImage ? (
        <img src={fileValue} alt="" className="h-20 w-full object-contain mb-2 rounded-lg bg-gray-50" />
      ) : (
        <div className="h-20 w-full flex items-center justify-center mb-2 rounded-lg bg-gray-50 text-sm text-gray-500">{t("fileAttached")}</div>
      ))}
      <label className="cursor-pointer inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
        {fileValue ? t("replaceFile") : t("chooseFile")}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      </label>
      {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
    </div>
  );
}
