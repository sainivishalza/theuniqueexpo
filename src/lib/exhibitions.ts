export interface Exhibition {
  id: string;
  title: string;
  slug: string;
  dates: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  highlights: string[];
  exhibitors: number;
  visitors: string;
  organizer: string;
  website: string;
  color: string;
}

export const exhibitions: Exhibition[] = [
  {
    id: "1",
    title: "2026 Global Ocean City Food Expo",
    slug: "global-ocean-city-food-expo-2026",
    dates: "March 29–31, 2026",
    startDate: "2026-03-29",
    endDate: "2026-03-31",
    venue: "Xiamen International Conference & Exhibition Center",
    city: "Xiamen",
    country: "China",
    industry: "Food & Beverage",
    description:
      "The Global Ocean City Food Expo brings together leading food and beverage manufacturers, distributors, and buyers from around the world. Explore the latest in seafood processing, agricultural products, food technology, and sustainable packaging solutions.",
    highlights: [
      "500+ exhibitors from 30+ countries",
      "Live seafood & food processing demos",
      "International chef competition",
      "B2B matchmaking sessions",
      "Sustainable food packaging forum",
    ],
    exhibitors: 500,
    visitors: "30,000+",
    organizer: "China Food Industry Association",
    website: "https://www.winbtb.com/expo/114",
    color: "#0EA5E9",
  },
  {
    id: "2",
    title: "The 99th China Automobile Parts Fair",
    slug: "99th-china-automobile-parts-fair-2026",
    dates: "May 13–15, 2026",
    startDate: "2026-05-13",
    endDate: "2026-05-15",
    venue: "Chongqing International Expo Center",
    city: "Chongqing",
    country: "China",
    industry: "Automotive",
    description:
      "One of the largest and most influential auto parts exhibitions in China. The 99th edition covers the full spectrum of automotive components, EV parts, diagnostic equipment, and aftermarket services.",
    highlights: [
      "2,000+ exhibitors",
      "EV & new energy vehicle parts zone",
      "OEM procurement matchmaking",
      "Automotive technology summit",
      "Live product demonstrations",
    ],
    exhibitors: 2000,
    visitors: "80,000+",
    organizer: "China Machinery Industry Federation",
    website: "https://www.winbtb.com/exhibit/118",
    color: "#DC2626",
  },
  {
    id: "3",
    title: "China (Wuxi) Industrial Valve Expo",
    slug: "china-wuxi-industrial-valve-expo-2026",
    dates: "August 20–22, 2026",
    startDate: "2026-08-20",
    endDate: "2026-08-22",
    venue: "Wuxi Taihu International Expo Center",
    city: "Wuxi",
    country: "China",
    industry: "Industrial",
    description:
      "The premier industrial valve exhibition in China, showcasing the latest in valve manufacturing, flow control technology, actuator systems, and piping solutions for oil & gas, chemical, and water treatment industries.",
    highlights: [
      "300+ valve manufacturers",
      "Flow control technology showcase",
      "International procurement meeting",
      "Technical seminars & workshops",
      "New product launch zone",
    ],
    exhibitors: 300,
    visitors: "15,000+",
    organizer: "Wuxi Valve Industry Association",
    website: "https://www.winbtb.com/expo/138",
    color: "#7C3AED",
  },
  {
    id: "4",
    title: "The 5th Global Digital Trade Expo",
    slug: "5th-global-digital-trade-expo-2026",
    dates: "September 23–27, 2026",
    startDate: "2026-09-23",
    endDate: "2026-09-27",
    venue: "Hangzhou International Expo Center",
    city: "Hangzhou",
    country: "China",
    industry: "Digital Trade",
    description:
      "Asia's leading digital trade exhibition, featuring cross-border e-commerce platforms, AI-powered trade solutions, fintech, blockchain logistics, and smart supply chain innovations.",
    highlights: [
      "1,000+ global exhibitors",
      "Cross-border e-commerce forum",
      "AI & blockchain in trade summit",
      "Digital payment solutions zone",
      "Startup innovation pavilion",
    ],
    exhibitors: 1000,
    visitors: "100,000+",
    organizer: "Hangzhou Municipal Government",
    website: "https://www.winbtb.com/expo/129",
    color: "#2563EB",
  },
  {
    id: "5",
    title: "The 26th China Anping International Wire Mesh Fair",
    slug: "26th-china-anping-wire-mesh-fair-2026",
    dates: "October 22–24, 2026",
    startDate: "2026-10-22",
    endDate: "2026-10-24",
    venue: "Anping County Exhibition Center",
    city: "Hengshui",
    country: "China",
    industry: "Manufacturing",
    description:
      "The world's largest wire mesh exhibition, held in Anping — the Wire Mesh Capital of China. Features industrial wire mesh, fencing, filters, metal processing equipment, and construction mesh products.",
    highlights: [
      "800+ exhibitors from 50+ countries",
      "Wire mesh manufacturing demos",
      "International trade forums",
      "Industrial filtration showcase",
      "Construction mesh innovation zone",
    ],
    exhibitors: 800,
    visitors: "50,000+",
    organizer: "Anping County Government",
    website: "https://www.winbtb.com/expo/103",
    color: "#D97706",
  },
  {
    id: "6",
    title: "The 31st Macao International Trade & Investment Fair",
    slug: "31st-macao-mif-2026",
    dates: "October 21–24, 2026",
    startDate: "2026-10-21",
    endDate: "2026-10-24",
    venue: "Cotai Expo, The Venetian Macao",
    city: "Macao",
    country: "China",
    industry: "Trade & Investment",
    description:
      "Macao's flagship international trade and investment event, connecting businesses from China, Portuguese-speaking countries, and Southeast Asia. Features investment promotion, trade matching, and economic cooperation forums.",
    highlights: [
      "2,000+ exhibitors",
      "Investment promotion conferences",
      "Portuguese-speaking countries pavilion",
      "Business matching platform",
      "Guangdong-Hong Kong-Macao cooperation zone",
    ],
    exhibitors: 2000,
    visitors: "60,000+",
    organizer: "Macao Trade and Investment Promotion Institute",
    website: "https://www.winbtb.com/expo/133",
    color: "#059669",
  },
];

export function getExhibitionById(id: string): Exhibition | undefined {
  return exhibitions.find((e) => e.id === id || e.slug === id);
}

export function getIndustries(): string[] {
  return [...new Set(exhibitions.map((e) => e.industry))].sort();
}

export function getCities(): string[] {
  return [...new Set(exhibitions.map((e) => e.city))].sort();
}
