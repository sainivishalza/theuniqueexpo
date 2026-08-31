"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { ExpoRegistration } from "@/lib/expo-registrations";

interface Exhibition { id: string; slug: string; title: string; }
type RegistrationSummary = Pick<
  ExpoRegistration,
  "id" | "registrationType" | "fullName" | "gender" | "email" | "phone" | "nationality" |
  "companyName" | "companyWebsite" | "companyType" | "companyScale" | "purposeOfVisit" |
  "exportingMarkets" | "status" | "createdAt"
>;

const STATUSES = ["pending", "approved", "rejected"];

export default function AdminExpoRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpoRegistration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`/api/admin/expo-registrations?exhibition=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setExhibition(data.exhibition);
        setRegistrations(data.registrations || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: status as any } : r)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function viewDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setDetail(data.registration);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/exhibitions" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">← Back to Exhibitions</Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{exhibition ? `${exhibition.title} — Registrations` : "Registrations"}</h1>
              <p className="mt-1 text-emerald-200/80">{loading ? "Loading..." : `${registrations.length} buyers/visitors registered`}</p>
            </div>
            {exhibition && (
              <a
                href={`/api/admin/expo-registrations/export?exhibition=${exhibition.slug}`}
                className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                ⬇ Export to Excel
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && registrations.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No registrations yet</h3>
              <p className="text-gray-500">Buyer and visitor registrations for this expo will appear here.</p>
            </div>
          ) : !error && (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Company</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Purpose</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600"></th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.fullName}<br/><span className="text-xs text-gray-400">{r.nationality}</span></td>
                    <td className="px-6 py-4 capitalize text-gray-700">{r.registrationType}</td>
                    <td className="px-6 py-4 text-gray-500">{r.companyName}</td>
                    <td className="px-6 py-4 text-gray-500">{r.email}<br/><span className="text-xs text-gray-400">{r.phone}</span></td>
                    <td className="px-6 py-4 text-gray-500">{r.purposeOfVisit}</td>
                    <td className="px-6 py-4">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => viewDetail(r.id)} className="text-xs font-semibold text-emerald-600 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </section>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            {detailLoading && !detail ? (
              <p className="text-gray-500 text-center py-10">Loading...</p>
            ) : detail && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{detail.fullName}</h2>
                  <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <Detail label="Registration Type" value={detail.registrationType} capitalize />
                  <Detail label="Gender" value={detail.gender} capitalize />
                  <Detail label="Nationality" value={detail.nationality} />
                  <Detail label="Passport Number" value={detail.passportNumber} />
                  <Detail label="Email" value={detail.email} />
                  <Detail label="Phone" value={detail.phone} />
                  <Detail label="Company" value={detail.companyName} />
                  <Detail label="Website" value={detail.companyWebsite || "—"} />
                  <Detail label="Company Type" value={detail.companyType === "Other" ? detail.companyTypeOther : detail.companyType} />
                  <Detail label="Company Scale" value={detail.companyScale} />
                  <Detail label="Purpose of Visit" value={detail.purposeOfVisit} />
                  <Detail label="Info Source" value={detail.infoSource === "Other" ? detail.infoSourceOther : detail.infoSource} />
                  <Detail label="Exporting Markets" value={detail.exportingMarkets.map((m) => (m === "Other" ? detail.exportingMarketOther : m)).join(", ")} />
                </div>
                {detail.companyIntro && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Company Introduction</p>
                    <p className="text-sm text-gray-700">{detail.companyIntro}</p>
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Passport Front Page", src: detail.docPassportFront },
                    { label: "Business Card", src: detail.docBusinessCard },
                    { label: "Visa Page", src: detail.docVisaPage },
                    { label: "Business License", src: detail.docBusinessLicense },
                    { label: "Order List", src: detail.docOrderList },
                  ].filter((d) => d.src).map((d) => (
                    <a key={d.label} href={d.src} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400">
                      {d.src!.startsWith("data:image") ? (
                        <img src={d.src} alt={d.label} className="h-28 w-full object-contain rounded-lg bg-gray-50" />
                      ) : (
                        <div className="h-28 w-full flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">📄 View file</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1 text-center">{d.label}</p>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
      <p className={`text-gray-900 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
