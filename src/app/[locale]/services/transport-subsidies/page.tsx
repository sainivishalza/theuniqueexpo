"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { subsidies, getOpenSubsidies } from "@/lib/subsidies";
import { errorMessage } from "@/lib/format";

export default function SubsidiesPage() {
  const t = useTranslations("transportSubsidiesPage");
  const openSubsidies = getOpenSubsidies();
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const handleSubmit = async (e: React.FormEvent, subsidyId: string) => {
    e.preventDefault();
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
    } catch (err) {
      setError(errorMessage(err, t("requestFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-500/20 backdrop-blur-sm px-4 py-2 text-sm text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {t("subsidiesCurrentlyOpen", { count: openSubsidies.length })}
          </div>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          {subsidies.map((sub) => {
            const isOpen = sub.status !== "closed";
            const isSubmitted = submittedIds.includes(sub.id);
            const isFormOpen = openFormId === sub.id;
            return (
              <div key={sub.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${sub.status === "closed" ? "opacity-60" : ""}`}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`rounded-lg px-3 py-1 text-xs font-bold ${sub.status === "open" ? "bg-green-100 text-green-700" : sub.status === "closing-soon" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                          {sub.status === "open" ? t("statusOpen") : sub.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
                        </span>
                        <span className="text-sm text-gray-400">{sub.exhibitionTitle}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{sub.title}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-emerald-600">{sub.amount}</div>
                      <div className="text-sm text-gray-400">{t("deadline", { date: sub.deadline })}</div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">{sub.description}</p>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3">{t("eligibility")}</h3>
                      <ul className="space-y-2">
                        {sub.eligibility.map((e) => (<li key={e} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-emerald-500">•</span>{e}</li>))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3">{t("requiredDocuments")}</h3>
                      <ul className="space-y-2">
                        {sub.documents.map((d) => (<li key={d} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-amber-500">📄</span>{d}</li>))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3">{t("howToApply")}</h3>
                      <ol className="space-y-2">
                        {sub.howToApply.map((h, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500 font-bold">{i + 1}.</span>{h}</li>))}
                      </ol>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {isSubmitted ? (
                        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">{t("assistanceRequested")}</div>
                      ) : isFormOpen ? (
                        <form onSubmit={(e) => handleSubmit(e, sub.id)} className="space-y-4 max-w-lg">
                          <p className="text-sm text-gray-500">{t("assistanceFormHint")}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label><input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                          </div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("company")}</label><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("message")}</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} placeholder={t("messagePlaceholder")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                          <div className="flex gap-3">
                            <button type="submit" disabled={submitting} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? t("submitting") : t("submitAssistanceRequest")}</button>
                            <button type="button" onClick={() => { setOpenFormId(null); setError(""); }} className="rounded-xl px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">{t("cancel")}</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => { setOpenFormId(sub.id); setError(""); }} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">{t("requestAssistance")}</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
