export interface Referral {
  id: string;
  partnerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  signupDate: string;
  conversionStatus: "signed_up" | "booked_booth" | "posted_rfq";
  commission: number;
}

export interface PartnerStats {
  totalReferrals: number;
  totalCommission: number;
  conversionRate: number;
}

// Mock referrals for partner user
const mockReferrals: Referral[] = [
  {
    id: "ref-1",
    partnerId: "mock-1",
    referredUserId: "u-101",
    referredUserName: "Zhang Wei",
    referredUserEmail: "zhang@shenzhen-mfg.com",
    signupDate: "2026-03-10",
    conversionStatus: "booked_booth",
    commission: 450,
  },
  {
    id: "ref-2",
    partnerId: "mock-1",
    referredUserId: "u-102",
    referredUserName: "Sarah Johnson",
    referredUserEmail: "sarah@eurobuyers.co.uk",
    signupDate: "2026-03-18",
    conversionStatus: "posted_rfq",
    commission: 120,
  },
  {
    id: "ref-3",
    partnerId: "mock-1",
    referredUserId: "u-103",
    referredUserName: "Yuki Tanaka",
    referredUserEmail: "yuki@tokyo-imports.jp",
    signupDate: "2026-04-02",
    conversionStatus: "signed_up",
    commission: 0,
  },
];

export function getReferralsForPartner(partnerId: string): Referral[] {
  return mockReferrals.filter((r) => r.partnerId === partnerId);
}

export function getPartnerStats(partnerId: string): PartnerStats {
  const referrals = getReferralsForPartner(partnerId);
  const conversions = referrals.filter(
    (r) => r.conversionStatus !== "signed_up"
  ).length;

  return {
    totalReferrals: referrals.length,
    totalCommission: referrals.reduce((sum, r) => sum + r.commission, 0),
    conversionRate: referrals.length
      ? Math.round((conversions / referrals.length) * 100)
      : 0,
  };
}

export function generateReferralLink(partnerId: string): string {
  return `https://expobridge.com/register?ref=${partnerId}`;
}
