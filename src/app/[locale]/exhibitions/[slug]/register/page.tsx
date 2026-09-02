"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  COMPANY_TYPES, COMPANY_SCALES, PURPOSES_OF_VISIT, INFO_SOURCES, EXPORTING_MARKETS, NATIONALITIES,
  type RegistrationType, type Gender, type ExpoRegistrationInput,
} from "@/lib/expo-registrations";
import { validateCustomAnswers, type CustomFormField, type CustomFormSchema } from "@/lib/custom-registration-form";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";

interface Exhibition {
  id: string; slug: string; title: string; dates: string;
  registrationEnabled: boolean; registrationFormSchema: CustomFormSchema | null;
}

const EMPTY_FORM: Omit<ExpoRegistrationInput, "exhibitionId"> = {
  registrationType: "buyer",
  gender: "male",
  fullName: "",
  nationality: "",
  passportNumber: "",
  companyName: "",
  companyWebsite: "",
  phone: "",
  email: "",
  companyType: "",
  companyTypeOther: "",
  companyScale: "",
  companyIntro: "",
  purposeOfVisit: "",
  infoSource: "",
  infoSourceOther: "",
  exportingMarkets: [],
  exportingMarketOther: "",
  docPassportFront: "",
  docBusinessCard: "",
  docVisaPage: "",
  docBusinessLicense: "",
  docOrderList: "",
};

const DOCUMENT_FIELD_KEYS: { key: keyof typeof EMPTY_FORM; labelKey: string; required: boolean }[] = [
  { key: "docPassportFront", labelKey: "passportFrontPage", required: true },
  { key: "docBusinessCard", labelKey: "businessCard", required: true },
  { key: "docVisaPage", labelKey: "visaPage", required: true },
  { key: "docBusinessLicense", labelKey: "businessLicense", required: true },
  { key: "docOrderList", labelKey: "orderList", required: false },
];

// Without this, a genuinely dead connection leaves the submit button
// spinning forever with no way out but reloading the page. Give up after a
// minute so the visitor gets an error (and can retry) instead of a stuck UI.
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default function ExpoRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("expoRegisterPage");
  const DOCUMENT_FIELDS = DOCUMENT_FIELD_KEYS.map((d) => ({ ...d, label: t(`documents.${d.labelKey}`) }));
  const { user, loading: authLoading, setUser } = useAuth();
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);
  const [form, setForm] = useState(EMPTY_FORM);
  const [password, setPassword] = useState("");
  // Only used by the custom-schema branch, which has no built-in email/name
  // fields of its own to create an account from.
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [customFileErrors, setCustomFileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExpo(data.exhibition))
      .catch(() => setExpo(null));
  }, [slug]);

  // Prefill from the customer's most recent registration (any expo) so
  // they don't have to retype details or re-upload documents every time.
  useEffect(() => {
    if (!user) return;
    fetch("/api/expo-registrations/me")
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((data) => {
        const prev = data.registration;
        if (!prev) return;
        setForm((f) => ({
          ...f,
          gender: prev.gender,
          fullName: prev.fullName,
          nationality: prev.nationality,
          passportNumber: prev.passportNumber,
          companyName: prev.companyName,
          companyWebsite: prev.companyWebsite,
          phone: prev.phone,
          email: prev.email,
          companyType: prev.companyType,
          companyTypeOther: prev.companyTypeOther,
          companyScale: prev.companyScale,
          companyIntro: prev.companyIntro,
          exportingMarkets: prev.exportingMarkets || [],
          exportingMarketOther: prev.exportingMarketOther,
          docPassportFront: prev.docPassportFront,
          docBusinessCard: prev.docBusinessCard,
          docVisaPage: prev.docVisaPage,
          docBusinessLicense: prev.docBusinessLicense,
          docOrderList: prev.docOrderList || "",
        }));
      })
      .catch(() => {});
  }, [user]);

  async function handleFile(key: keyof typeof EMPTY_FORM, file: File | null) {
    setFileErrors((prev) => ({ ...prev, [key]: "" }));
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setFileErrors((prev) => ({ ...prev, [key]: t("fileTooLarge") }));
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      setForm((f) => ({ ...f, [key]: dataUrl }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [key]: t("couldNotReadFile") }));
    }
  }

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

  async function handleCustomSubmit(e: React.FormEvent, schema: CustomFormSchema) {
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
      const res = await fetchWithTimeout("/api/expo-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exhibitionSlug: slug,
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

  function toggleMarket(market: string) {
    setForm((f) => ({
      ...f,
      exportingMarkets: f.exportingMarkets.includes(market)
        ? f.exportingMarkets.filter((m) => m !== market)
        : [...f.exportingMarkets, market],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAccountExists(false);
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/expo-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exhibitionSlug: slug, ...form, ...(!user ? { password } : {}) }),
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

  if (expo === undefined || authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }
  if (!expo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
          <Link href="/exhibitions" className="mt-4 inline-block text-emerald-600 hover:underline">{t("browseAll")}</Link>
        </div>
      </div>
    );
  }
  if (!expo.registrationEnabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("registrationClosed")}</h1>
          <p className="text-gray-500 mb-6">{t.rich("registrationClosedHint", { name: expo.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <Link href={`/exhibitions/${expo.slug}`} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("backTo", { name: expo.title })}</Link>
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
          <p className="text-gray-500 mb-6">{t.rich("registrationSubmittedHint", { name: expo.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <Link href={`/exhibitions/${expo.slug}`} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("backTo", { name: expo.title })}</Link>
        </div>
      </div>
    );
  }

  const customSchema = expo.registrationFormSchema;
  if (customSchema && customSchema.length > 0) {
    return (
      <div className="py-12 bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-3xl px-6">
          <Link href={`/exhibitions/${expo.slug}`} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backTo", { name: expo.title })}</Link>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t("registerFor", { name: expo.title })}</h1>
          <p className="text-gray-500 mb-8">{t("datesLine", { dates: expo.dates })}</p>

          <form onSubmit={(e) => handleCustomSubmit(e, customSchema)} className="space-y-6">
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
              {customSchema.map((field) => (
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

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={`/exhibitions/${expo.slug}`} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backTo", { name: expo.title })}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t("registerFor", { name: expo.title })}</h1>
        <p className="text-gray-500 mb-8">{t("datesLine", { dates: expo.dates })}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Registration type */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("registeringAs")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["buyer", "visitor"] as RegistrationType[]).map((rt) => (
                <button key={rt} type="button" onClick={() => setForm({ ...form, registrationType: rt })}
                  className={`p-4 rounded-xl border-2 text-center font-semibold capitalize transition-all ${form.registrationType === rt ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {t(`roles.${rt}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Personal details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">{t("personalInformation")}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("genderRequired")}</label>
              <div className="flex gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <label key={g} className={`flex-1 text-center capitalize p-3 rounded-xl border cursor-pointer ${form.gender === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"}`}>
                    <input type="radio" name="gender" className="hidden" checked={form.gender === g} onChange={() => setForm({ ...form, gender: g })} />
                    {t(`genders.${g}`)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label={t("fullName")} required value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <SelectField label={t("nationality")} required value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} options={NATIONALITIES as unknown as string[]} placeholder={t("selectNationality")} />
              <TextField label={t("passportNumber")} required value={form.passportNumber} onChange={(v) => setForm({ ...form, passportNumber: v })} />
              <TextField label={t("phoneNumber")} type="tel" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <TextField label={t("email")} type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              {!user && (
                <TextField label={t("password")} type="password" required value={password} onChange={setPassword} placeholder={t("passwordCreatesAccount")} />
              )}
            </div>
          </div>

          {/* Company details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">{t("companyInformation")}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label={t("companyName")} required value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
              <TextField label={t("companyWebsite")} value={form.companyWebsite} onChange={(v) => setForm({ ...form, companyWebsite: v })} placeholder={t("optional")} />
            </div>
            <OptionGroup label={t("companyType")} required options={COMPANY_TYPES as unknown as string[]} value={form.companyType} onChange={(v) => setForm({ ...form, companyType: v })} />
            {form.companyType === "Other" && (
              <TextField label={t("pleaseSpecifyCompanyNature")} required value={form.companyTypeOther} onChange={(v) => setForm({ ...form, companyTypeOther: v })} />
            )}
            <OptionGroup label={t("companyScale")} required options={COMPANY_SCALES as unknown as string[]} value={form.companyScale} onChange={(v) => setForm({ ...form, companyScale: v })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("companyIntro")}</label>
              <textarea value={form.companyIntro} onChange={(e) => setForm({ ...form, companyIntro: e.target.value })} rows={3} placeholder={t("optional")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" />
            </div>
          </div>

          {/* Visit details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">{t("visitDetails")}</h2>
            <OptionGroup label={t("purposeOfVisit")} required options={PURPOSES_OF_VISIT as unknown as string[]} value={form.purposeOfVisit} onChange={(v) => setForm({ ...form, purposeOfVisit: v })} />
            <OptionGroup label={t("infoSource")} required options={INFO_SOURCES as unknown as string[]} value={form.infoSource} onChange={(v) => setForm({ ...form, infoSource: v })} />
            {form.infoSource === "Other" && (
              <TextField label={t("pleaseSpecify")} required value={form.infoSourceOther} onChange={(v) => setForm({ ...form, infoSourceOther: v })} />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("exportingMarketRequired")}</label>
              <div className="grid gap-3 md:grid-cols-2">
                {EXPORTING_MARKETS.map((m) => (
                  <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.exportingMarkets.includes(m) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="checkbox" checked={form.exportingMarkets.includes(m)} onChange={() => toggleMarket(m)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">{m}</span>
                  </label>
                ))}
              </div>
              {form.exportingMarkets.includes("Other") && (
                <div className="mt-3">
                  <TextField label={t("pleaseSpecify")} required value={form.exportingMarketOther} onChange={(v) => setForm({ ...form, exportingMarketOther: v })} />
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">{t("uploadDocuments")}</h2>
            <p className="text-sm text-gray-500">{t("uploadDocumentsHint")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {DOCUMENT_FIELDS.map(({ key, label, required }) => {
                const value = form[key] as string;
                const isImage = value.startsWith("data:image");
                return (
                  <div key={key} className="rounded-xl border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label} {required && "*"}</label>
                    {value && (isImage ? (
                      <img src={value} alt="" className="h-20 w-full object-contain mb-2 rounded-lg bg-gray-50" />
                    ) : (
                      <div className="h-20 w-full flex items-center justify-center mb-2 rounded-lg bg-gray-50 text-sm text-gray-500">{t("fileAttached")}</div>
                    ))}
                    <label className="cursor-pointer inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      {value ? t("replaceFile") : t("chooseFile")}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFile(key, e.target.files?.[0] || null)} />
                    </label>
                    {fileErrors[key] && <p className="mt-1 text-xs text-red-600">{fileErrors[key]}</p>}
                  </div>
                );
              })}
            </div>
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

function SelectField({ label, value, onChange, options, required, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && "*"}</label>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white">
        <option value="" disabled>{placeholder || "Select"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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
  const t = useTranslations("expoRegisterPage");
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
