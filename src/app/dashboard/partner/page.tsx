"use client";

import { useAuth } from "@/lib/auth-context";
import { getReferralsForPartner, getPartnerStats, generateReferralLink } from "@/lib/partners";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const referrals = user ? getReferralsForPartner(user.id) : [];
  const stats = user ? getPartnerStats(user.id) : { totalReferrals: 0, totalCommission: 0, conversionRate: 0 };
  const referralLink = user ? generateReferralLink(user.id) : "";

  const statusLabels: Record<string, { label: string; color: string }> = {
    signed_up: { label: "Signed Up", color: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
    booked_booth: { label: "Booked Booth", color: "bg-green-100 text-green-700 border border-green-200" },
    posted_rfq: { label: "Posted RFQ", color: "bg-blue-100 text-blue-700 border border-blue-200" },
  };

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🤝</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">Partner Dashboard</h1>
              <p className="mt-1 text-blue-200/80">Welcome back{user?.name ? `, ${user.name}` : ""}. Track your referrals and earnings.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
              <div className="text-sm opacity-70 mb-1">👥 Referrals</div>
              <div className="text-2xl font-extrabold text-white">{stats.totalReferrals}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
              <div className="text-sm opacity-70 mb-1">💰 Commission</div>
              <div className="text-2xl font-extrabold text-white">${stats.totalCommission}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
              <div className="text-sm opacity-70 mb-1">📈 Conversion</div>
              <div className="text-2xl font-extrabold text-white">{stats.conversionRate}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {/* Referral Link */}
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your Referral Link</h2>
            <p className="text-sm text-gray-500 mb-4">Share this with potential exhibitors and buyers. Signups are tracked automatically.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono text-gray-700"
              />
              <button
                onClick={() => navigator.clipboard.writeText(referralLink)}
                className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Referred Users ({referrals.length})</h2>
            </div>
            {referrals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No referrals yet</h3>
                <p className="text-gray-500">Share your link to start earning commissions.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {referrals.map((ref) => {
                    const status = statusLabels[ref.conversionStatus];
                    return (
                      <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{ref.referredUserName}</td>
                        <td className="px-6 py-4 text-gray-500">{ref.referredUserEmail}</td>
                        <td className="px-6 py-4 text-gray-500">{ref.signupDate}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {ref.commission > 0 ? `$${ref.commission}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Marketing Kit */}
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Marketing Kit</h2>
            <p className="text-sm text-gray-500 mb-5">Download materials to promote The Unique Expo in your region.</p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: "📄", label: "Pitch Deck (PDF)" },
                { icon: "🖼️", label: "Banner Pack" },
                { icon: "📋", label: "Brochure" },
              ].map((m) => (
                <button key={m.label} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
