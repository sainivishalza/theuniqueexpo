"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  COMPANY_TYPES, COMPANY_SCALES, PURPOSES_OF_VISIT, INFO_SOURCES, EXPORTING_MARKETS, NATIONALITIES,
  type RegistrationType, type Gender, type ExpoRegistrationInput,
} from "@/lib/expo-registrations";

interface Exhibition {
  id: string; slug: string; title: string; dates: string;
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

const DOCUMENT_FIELDS: { key: keyof typeof EMPTY_FORM; label: string; required: boolean }[] = [
  { key: "docPassportFront", label: "Passport Front Page", required: true },
  { key: "docBusinessCard", label: "Business Card", required: true },
  { key: "docVisaPage", label: "Visa Page", required: true },
  { key: "docBusinessLicense", label: "Business License", required: true },
  { key: "docOrderList", label: "Order List (if any)", required: false },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExpoRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

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
      setFileErrors((prev) => ({ ...prev, [key]: "File is too large. Please choose one under 8 MB." }));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((f) => ({ ...f, [key]: dataUrl }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [key]: "Couldn't read that file. Please try again." }));
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/expo-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exhibitionSlug: slug, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (expo === undefined || authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>;
  }
  if (!expo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">Exhibition not found</h1>
          <Link href="/exhibitions" className="mt-4 inline-block text-emerald-600 hover:underline">Browse all exhibitions →</Link>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to register</h1>
          <p className="text-gray-500 mb-6">Create a free account or sign in to register for <strong>{expo.title}</strong> as a Buyer or Visitor.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Sign In</Link>
            <Link href="/register" className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h1>
          <p className="text-gray-500 mb-6">Your {form.registrationType} registration for <strong>{expo.title}</strong> has been received. Our team will review it shortly.</p>
          <Link href={`/exhibitions/${expo.slug}`} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">← Back to {expo.title}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={`/exhibitions/${expo.slug}`} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">← Back to {expo.title}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Register for {expo.title}</h1>
        <p className="text-gray-500 mb-8">{expo.dates} • Registration is required separately for each exhibition.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Registration type */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registering as</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["buyer", "visitor"] as RegistrationType[]).map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, registrationType: t })}
                  className={`p-4 rounded-xl border-2 text-center font-semibold capitalize transition-all ${form.registrationType === t ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Personal details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <div className="flex gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <label key={g} className={`flex-1 text-center capitalize p-3 rounded-xl border cursor-pointer ${form.gender === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"}`}>
                    <input type="radio" name="gender" className="hidden" checked={form.gender === g} onChange={() => setForm({ ...form, gender: g })} />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Full Name" required value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <SelectField label="Nationality" required value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} options={NATIONALITIES as unknown as string[]} placeholder="Select nationality" />
              <TextField label="Passport Number" required value={form.passportNumber} onChange={(v) => setForm({ ...form, passportNumber: v })} />
              <TextField label="Phone Number" type="tel" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <TextField label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            </div>
          </div>

          {/* Company details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Company Name" required value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
              <TextField label="Company Website" value={form.companyWebsite} onChange={(v) => setForm({ ...form, companyWebsite: v })} placeholder="Optional" />
            </div>
            <OptionGroup label="Company Type" required options={COMPANY_TYPES as unknown as string[]} value={form.companyType} onChange={(v) => setForm({ ...form, companyType: v })} />
            {form.companyType === "Other" && (
              <TextField label="Please specify your company nature" required value={form.companyTypeOther} onChange={(v) => setForm({ ...form, companyTypeOther: v })} />
            )}
            <OptionGroup label="Company Scale (Staff)" required options={COMPANY_SCALES as unknown as string[]} value={form.companyScale} onChange={(v) => setForm({ ...form, companyScale: v })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brief Company Introduction</label>
              <textarea value={form.companyIntro} onChange={(e) => setForm({ ...form, companyIntro: e.target.value })} rows={3} placeholder="Optional" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" />
            </div>
          </div>

          {/* Visit details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Visit Details</h2>
            <OptionGroup label="Purpose of Visit" required options={PURPOSES_OF_VISIT as unknown as string[]} value={form.purposeOfVisit} onChange={(v) => setForm({ ...form, purposeOfVisit: v })} />
            <OptionGroup label="Where Did You Get This Event Information" required options={INFO_SOURCES as unknown as string[]} value={form.infoSource} onChange={(v) => setForm({ ...form, infoSource: v })} />
            {form.infoSource === "Other" && (
              <TextField label="Please specify" required value={form.infoSourceOther} onChange={(v) => setForm({ ...form, infoSourceOther: v })} />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What is Your Exporting Market? *</label>
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
                  <TextField label="Please specify" required value={form.exportingMarketOther} onChange={(v) => setForm({ ...form, exportingMarketOther: v })} />
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Upload Documents</h2>
            <p className="text-sm text-gray-500">Passport, business card, visa page, and business license are required. If you registered with us before, we've reused your previously uploaded copies — upload a new file only to replace one.</p>
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
                      <div className="h-20 w-full flex items-center justify-center mb-2 rounded-lg bg-gray-50 text-sm text-gray-500">📄 File attached</div>
                    ))}
                    <label className="cursor-pointer inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      {value ? "Replace file" : "Choose file"}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFile(key, e.target.files?.[0] || null)} />
                    </label>
                    {fileErrors[key] && <p className="mt-1 text-xs text-red-600">{fileErrors[key]}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Registration"}
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
