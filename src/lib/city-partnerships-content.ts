export interface CityPartnershipBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface CityPartnershipsContent {
  title: string;
  subtitle: string;
  heroImage: string;
  benefits: CityPartnershipBenefit[];
}

export const DEFAULT_CITY_PARTNERSHIPS_CONTENT: CityPartnershipsContent = {
  title: "Promote your city to global buyers and exhibitors",
  subtitle: "Partner with us to put your city in front of the buyers and exhibitors already using our platform for China's major trade fairs.",
  heroImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&h=600&fit=crop&q=80",
  benefits: [
    { icon: "🌍", title: "Reach an Active Audience", desc: "Thousands of buyers and exhibitors already planning trips to China." },
    { icon: "🏆", title: "Destination Spotlights", desc: "Featured placement on relevant exhibition and tour pages." },
    { icon: "📣", title: "Co-Marketing", desc: "Joint content, social posts, and newsletter features." },
    { icon: "🧭", title: "Delegation Support", desc: "Help hosting buyer delegations visiting your city." },
  ],
};

function isBenefit(value: unknown): value is CityPartnershipBenefit {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.title === "string" && typeof record.desc === "string";
}

export function normalizeCityPartnershipsContent(input: unknown): CityPartnershipsContent {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    title: typeof record.title === "string" ? record.title : DEFAULT_CITY_PARTNERSHIPS_CONTENT.title,
    subtitle: typeof record.subtitle === "string" ? record.subtitle : DEFAULT_CITY_PARTNERSHIPS_CONTENT.subtitle,
    heroImage: typeof record.heroImage === "string" ? record.heroImage : DEFAULT_CITY_PARTNERSHIPS_CONTENT.heroImage,
    benefits: Array.isArray(record.benefits)
      ? record.benefits.filter(isBenefit).map((b) => ({ icon: b.icon || "✨", title: b.title, desc: b.desc }))
      : DEFAULT_CITY_PARTNERSHIPS_CONTENT.benefits,
  };
}
