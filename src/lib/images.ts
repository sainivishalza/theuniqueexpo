// High-quality Unsplash images for exhibitions and industries
// Using specific Unsplash photo IDs for reliable, consistent images

export const exhibitionImages: Record<string, { hero: string; thumb: string }> = {
  "food-beverage": {
    hero: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop&q=80",
  },
  automotive: {
    hero: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop&q=80",
  },
  industrial: {
    hero: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&h=400&fit=crop&q=80",
  },
  "digital-trade": {
    hero: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop&q=80",
  },
  manufacturing: {
    hero: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop&q=80",
  },
  "trade-investment": {
    hero: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop&q=80",
    thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop&q=80",
  },
};

// Industry-specific image mapping
export const industryImages: Record<string, { hero: string; icon: string }> = {
  "Food & Beverage": {
    hero: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop&q=80",
    icon: "🍽️",
  },
  Automotive: {
    hero: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=600&fit=crop&q=80",
    icon: "🚗",
  },
  Industrial: {
    hero: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&h=600&fit=crop&q=80",
    icon: "⚙️",
  },
  "Digital Trade": {
    hero: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop&q=80",
    icon: "💻",
  },
  Manufacturing: {
    hero: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1200&h=600&fit=crop&q=80",
    icon: "🏭",
  },
  "Trade & Investment": {
    hero: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop&q=80",
    icon: "🤝",
  },
};

// Exhibition-specific hero images (unique per event)
export const exhibitionHeroImages: Record<string, string> = {
  "global-ocean-city-food-expo-2026":
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&h=700&fit=crop&q=80",
  "99th-china-automobile-parts-fair-2026":
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1400&h=700&fit=crop&q=80",
  "china-wuxi-industrial-valve-expo-2026":
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1400&h=700&fit=crop&q=80",
  "5th-global-digital-trade-expo-2026":
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1400&h=700&fit=crop&q=80",
  "26th-china-anping-wire-mesh-fair-2026":
    "https://images.unsplash.com/photo-1537462715315-f7b8d565af09?w=1400&h=700&fit=crop&q=80",
  "31st-macao-mif-2026":
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&h=700&fit=crop&q=80",
};

// Default hero images for sections
export const defaultImages = {
  hero: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&h=700&fit=crop&q=80",
  booth: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=500&fit=crop&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop&q=80",
  marketplace: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=500&fit=crop&q=80",
  directory: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80",
  partner: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=500&fit=crop&q=80",
};
