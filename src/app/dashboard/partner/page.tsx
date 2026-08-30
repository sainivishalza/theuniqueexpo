"use client";

import { useAuth } from "@/lib/auth-context";
import { getReferralsForPartner, getPartnerStats, generateReferralLink } from "@/lib/partners";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const referrals = user ? getReferralsForPartner(user.id) : [];
  const stats = user ? getPartnerStats(user.id) : { totalReferrals: 0, totalCommission: 0, conversionRate: 0 };
  const referralLink = user ? generateReferralLink(user.id) : "";

  const statusLabels: Record<string, { label: string; color: string }> = {
    signed_up: { label: "Signed Up", color: "bg-yellow-100 text-yellow-700" },
    booked_booth: { label: "Booked Booth", color: "bg-green-100 text-green-700" },
    posted_rfq: { label: "Posted RFQ", color: "bg-blue-100 text-blue-700" },
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Track referrals, commissions, and performance.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Referrals" value={stats.totalReferrals} icon="👥" />
        <StatCard label="Commission Earned" value={`$${stats.totalCommission}`} icon="💰" />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon="📈" />
      </div>

      {/* Referral Link */}
      <div className="mb-8 rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold">Your Referral Link</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share this link with potential exhibitors and buyers. Signups are tracked automatically.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={() => navigator.clipboard.writeText(referralLink)}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Referred Users Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Referred Users ({referrals.length})</h2>

        {referrals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-400">No referrals yet. Share your link to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Signup Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((ref) => {
                  const status = statusLabels[ref.conversionStatus];
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ref.referredUserName}</td>
                      <td className="px-4 py-3 text-gray-500">{ref.referredUserEmail}</td>
                      <td className="px-4 py-3 text-gray-500">{ref.signupDate}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {ref.commission > 0 ? `$${ref.commission}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Marketing Kit */}
      <div className="mt-8 rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold">Marketing Kit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Download materials to help you promote ExpoBridge in your region.
        </p>
        <div className="mt-3 flex gap-3">
          <button className="rounded border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            📄 Pitch Deck (PDF)
          </button>
          <button className="rounded border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            🖼️ Banner Pack
          </button>
          <button className="rounded border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            📋 Brochure
          </button>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm text-gray-500">{label}</p>
    </div>
  );
}
