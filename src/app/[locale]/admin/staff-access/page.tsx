"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import TwoStepRule from "./TwoStepRule";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { fieldClasses } from "@/components/ui/FormField";
import { STAFF_PRESETS, type StaffPreset } from "@/lib/staff-access";

interface Staff { id: number; name: string; email: string; suspended: boolean; preset: StaffPreset }

// Who may do what in the back office: each admin account has full access or a limited role.
export default function AdminStaffAccessPage() {
  const t = useTranslations("adminStaffAccess");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [me, setMe] = useState<number | null>(null);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/staff-access", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) { setDenied(true); return null; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => { if (d) { setStaff(d.staff ?? []); setMe(d.me ?? null); } })
      .catch(() => setError(t("errors.load")));
  }, [t]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function change(member: Staff, preset: StaffPreset) {
    setBusyId(member.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/staff-access", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: member.id, preset }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
        return;
      }
      setStaff(data.staff ?? []);
      setMessage(t("saved", { name: member.name || member.email, role: t(`roles.${preset}.name`) }));
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin" || denied) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700" data-testid="staff-denied">{denied ? t("fullOnly") : ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-6 space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold text-heading">{t("rolesHeading")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {STAFF_PRESETS.map((p) => (
                <div key={p}><dt className="inline font-semibold text-heading">{t(`roles.${p}.name`)}: </dt><dd className="inline text-gray-700">{t(`roles.${p}.text`)}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-600">{t("note")}</p>
          </div>
          <TwoStepRule />
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm" data-testid="staff-table">
              <caption className="sr-only">{t("title")}</caption>
              <thead className="bg-cream-50"><tr><th scope="col" className="px-5 py-3 text-left font-semibold text-gray-700">{t("admin")}</th><th scope="col" className="px-5 py-3 text-left font-semibold text-gray-700">{t("role")}</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(staff ?? []).map((s) => (
                  <tr key={s.id} data-staff={s.id}>
                    <td className="px-5 py-3"><span className="font-semibold text-heading [overflow-wrap:anywhere]">{s.name || "—"}</span>{s.id === me && <span className="ml-2 text-xs text-gray-600">({t("you")})</span>}{s.suspended && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{t("suspended")}</span>}<span className="block text-gray-600 [overflow-wrap:anywhere]">{s.email}</span></td>
                    <td className="px-5 py-3">
                      <select aria-label={t("roleOf", { name: s.name || s.email })} value={s.preset} disabled={s.id === me || busyId === s.id} onChange={(e) => change(s, e.target.value as StaffPreset)} className={fieldClasses()}>
                        {STAFF_PRESETS.map((p) => <option key={p} value={p}>{t(`roles.${p}.name`)}</option>)}
                      </select>
                      {s.id === me && <p className="mt-1 text-xs text-gray-600">{t("ownRole")}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
