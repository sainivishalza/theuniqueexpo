"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import type { FaqItem } from "@/lib/faq-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function AdminFaqPage() {
  const t = useTranslations("adminFaq");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/faq")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setItems(data.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function updateItem(index: number, patch: Partial<FaqItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong"));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => updateItem(i, { question: e.target.value })}
                        placeholder={t("questionPlaceholder")}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                      />
                      <Button onClick={() => removeItem(i)} variant="linkDanger" size="inline" className="whitespace-nowrap py-2">{ta("delete")}</Button>
                    </div>
                    <textarea
                      value={item.answer}
                      onChange={(e) => updateItem(i, { answer: e.target.value })}
                      placeholder={t("answerPlaceholder")}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                    />
                  </div>
                ))}
                <Button onClick={addItem} variant="dashedAdd" size="blockSm">
                  {t("addQuestion")}
                </Button>
              </Card>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <Button onClick={handleSave} disabled={saving} variant="save" size="blockLg">
                {saving ? ta("saving") : t("saveButton")}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
