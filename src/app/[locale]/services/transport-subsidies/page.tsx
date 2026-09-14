"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { subsidies, getOpenSubsidies } from "@/lib/subsidies";
import { errorMessage } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubsidiesPage() {
  const t = useTranslations("transportSubsidiesPage");
  const tv = useTranslations("formValidation");
  const openSubsidies = getOpenSubsidies();
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, subsidyId: string) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/subsidy-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subsidyId, ...form }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("requestFailed"));
      setSubmittedIds((prev) => [...prev, subsidyId]);
      setOpenFormId(null);
      setForm({ name: "", email: "", company: "", message: "" });
      setFieldErrors({});
    } catch (err) {
      setError(errorMessage(err, t("requestFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-badge)] bg-green-500/20 backdrop-blur-sm px-4 py-2 text-sm text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {t("subsidiesCurrentlyOpen", { count: openSubsidies.length })}
          </div>
        </div>
      </section>
      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          {subsidies.map((sub) => {
            const isOpen = sub.status !== "closed";
            const isSubmitted = submittedIds.includes(sub.id);
            const isFormOpen = openFormId === sub.id;
            return (
              <Card key={sub.id} shadow="sm" bordered={false} className={sub.status === "closed" ? "opacity-60" : ""}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge tone={sub.status === "open" ? "success" : sub.status === "closing-soon" ? "warning" : "gray"} size="tag">
                          {sub.status === "open" ? t("statusOpen") : sub.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
                        </Badge>
                        <span className="text-sm text-gray-400">{sub.exhibitionTitle}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-heading">{sub.title}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-emerald-600">{sub.amount}</div>
                      <div className="text-sm text-gray-400">{t("deadline", { date: sub.deadline })}</div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">{sub.description}</p>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-heading mb-3">{t("eligibility")}</h3>
                      <ul className="space-y-2">
                        {sub.eligibility.map((e) => (<li key={e} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-emerald-500">•</span>{e}</li>))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-heading mb-3">{t("requiredDocuments")}</h3>
                      <ul className="space-y-2">
                        {sub.documents.map((d) => (<li key={d} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-amber-500">📄</span>{d}</li>))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-heading mb-3">{t("howToApply")}</h3>
                      <ol className="space-y-2">
                        {sub.howToApply.map((h, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500 font-bold">{i + 1}.</span>{h}</li>))}
                      </ol>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {isSubmitted ? (
                        <div className="rounded-[var(--radius-button)] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">{t("assistanceRequested")}</div>
                      ) : isFormOpen ? (
                        <form onSubmit={(e) => handleSubmit(e, sub.id)} noValidate className="space-y-4 max-w-lg">
                          <p className="text-sm text-gray-500">{t("assistanceFormHint")}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField label={t("name")} htmlFor={`name-${sub.id}`} error={fieldErrors.name}>
                              <input id={`name-${sub.id}`} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
                            </FormField>
                            <FormField label={t("email")} htmlFor={`email-${sub.id}`} error={fieldErrors.email}>
                              <input id={`email-${sub.id}`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
                            </FormField>
                          </div>
                          <FormField label={t("company")} htmlFor={`company-${sub.id}`}>
                            <input id={`company-${sub.id}`} type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={fieldClasses()} />
                          </FormField>
                          <FormField label={t("message")} htmlFor={`message-${sub.id}`}>
                            <textarea id={`message-${sub.id}`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} placeholder={t("messagePlaceholder")} className={fieldClasses(false, "resize-none")} />
                          </FormField>
                          {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                          <div className="flex gap-3">
                            <Button type="submit" disabled={submitting} variant="save" size="wide">{submitting ? t("submitting") : t("submitAssistanceRequest")}</Button>
                            <Button type="button" onClick={() => { setOpenFormId(null); setError(""); setFieldErrors({}); }} variant="ghost" size="wide">{t("cancel")}</Button>
                          </div>
                        </form>
                      ) : (
                        <Button onClick={() => { setOpenFormId(sub.id); setError(""); setFieldErrors({}); }} variant="save" size="wide">{t("requestAssistance")}</Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
