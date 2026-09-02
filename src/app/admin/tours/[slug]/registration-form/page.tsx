"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  newFieldId,
  isChoiceType,
  type CustomFormField,
  type CustomFieldType,
} from "@/lib/custom-registration-form";

interface TourSummary { id: string; title: string; slug: string; }

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Short answer",
  textarea: "Paragraph",
  radio: "Single choice",
  checkbox: "Multiple choice",
  file: "File upload",
};

export default function TourRegistrationFormBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [tour, setTour] = useState<TourSummary | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [fields, setFields] = useState<CustomFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`/api/admin/tours/${slug}/registration-form`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTour(data.tour);
        setEnabled(data.registrationEnabled);
        setFields(data.registrationFormSchema || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: newFieldId(), label: "", type: "text", required: true, options: [] },
    ]);
  }

  function updateField(id: string, patch: Partial<CustomFormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/tours/${slug}/registration-form`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationEnabled: enabled,
          registrationFormSchema: fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin/tours" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">← Back to Tours</Link>
          <h1 className="text-3xl font-extrabold text-white">{tour ? `${tour.title} — Registration Form` : "Registration Form"}</h1>
          <p className="mt-1 text-emerald-200/80">Control whether registration is open, and what this tour asks travelers when they register.</p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading...</p>
          ) : error && !tour ? (
            <p className="text-center text-red-600 py-10">{error}</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Registration Status</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {enabled ? "Travelers can register for this tour." : "Registration is closed — the \"Register\" button is hidden."}
                  </p>
                </div>
                <button
                  onClick={() => setEnabled((e) => !e)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">Registration Questions</h2>
                <div className="space-y-4">
                  {fields.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No fields yet — add your first question below.</p>
                  )}
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Question / Label</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="e.g. How many people are traveling?"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Field Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const type = e.target.value as CustomFieldType;
                                updateField(field.id, { type, options: isChoiceType(type) ? (field.options?.length ? field.options : [""]) : undefined });
                              }}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            >
                              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 pt-5">
                          <button onClick={() => moveField(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">▲</button>
                          <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">▼</button>
                        </div>
                      </div>

                      {isChoiceType(field.type) && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Options (one per line)</label>
                          <textarea
                            value={(field.options || []).join("\n")}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split("\n") })}
                            rows={3}
                            placeholder={"Option A\nOption B\nOption C"}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Required
                        </label>
                        <button onClick={() => removeField(field.id)} className="text-xs font-semibold text-red-600 hover:underline">Remove field</button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addField}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                  >
                    + Add Field
                  </button>
                </div>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Saved.</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Registration Form"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
