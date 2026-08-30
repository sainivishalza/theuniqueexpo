export interface Tour {
  id: string; slug: string; title: string;
  type: "business" | "china"; city: string;
  dates: string; startDate: string; endDate: string;
  duration: string; description: string;
  highlights: string[];
  itinerary: { day: string; title: string; description: string }[];
  price: number; currency: string; groupSize: string;
  included: string[]; notIncluded: string[];
  image: string; exhibitionSlug?: string;
}

export interface TourApplication {
  id: string; tourId: string; userId: string;
  name: string; email: string; phone: string;
  company: string; nationality: string;
  travelers: number; services: string[];
  specialRequests: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

const tourApplications: TourApplication[] = [];
export function getTourApplications() { return tourApplications; }
export function submitTourApplication(app: any): TourApplication {
  const n = {...app, id: "ta-"+Date.now(), status: "pending", createdAt: new Date().toISOString()};
  tourApplications.push(n); return n;
}
export const businessTours: Tour[] = [
  { id: "bt-1", slug: "ciftis-beijing-business-tour-2026", title: "CIFTIS Beijing Business Tour 2026", type: "business", city: "Beijing", dates: "September 7-14, 2026", startDate: "2026-09-07", endDate: "2026-09-14", duration: "8 days / 7 nights",
    description: "All-inclusive business tour to CIFTIS 2026 in Beijing.",
    highlights: ["VIP access to CIFTIS 2026", "B2B matchmaking", "Factory visits in Tianjin", "Zhongguancun tech hub tour", "Peking duck dinner", "Professional interpreter"],
    itinerary: [{day:"Day 1",title:"Arrival",description:"Airport pickup, hotel, welcome dinner"},{day:"Day 2",title:"CIFTIS Opening",description:"VIP exhibition access, keynotes"},{day:"Day 3",title:"B2B Matchmaking",description:"Guided tours, supplier meetings"},{day:"Day 4",title:"Tech Hub",description:"Zhongguancun Silicon Valley tour"},{day:"Day 5",title:"Tianjin Factories",description:"High-speed rail, factory visits"},{day:"Day 6",title:"Seminars",description:"Trade seminars, afternoon free"},{day:"Day 7",title:"Great Wall",description:"Great Wall visit, shopping"},{day:"Day 8",title:"Departure",description:"Airport transfer"}],
    price: 2800, currency: "USD", groupSize: "15-25 travelers",
    included: ["7 nights 4-star hotel","Daily breakfast & 3 dinners","Transport","VIP pass","Interpreter","Factory visits","Airport transfers"],
    notIncluded: ["Flights","Insurance","Personal expenses","Lunch"],
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop&q=80", exhibitionSlug: "ciftis-2026-beijing" },
  { id: "bt-2", slug: "cioe-shenzhen-business-tour-2026", title: "CIOE Shenzhen Business Tour 2026", type: "business", city: "Shenzhen", dates: "September 8-13, 2026", startDate: "2026-09-08", endDate: "2026-09-13", duration: "6 days / 5 nights",
    description: "Explore CIOE 2026 in Shenzhen, the world largest optoelectronics exhibition.",
    highlights: ["Full CIOE 2026 access", "Optoelectronics hall tours", "B2B meetings", "Huaqiangbei market", "Dongguan factory visits", "English-speaking guide"],
    itinerary: [{day:"Day 1",title:"Arrival",description:"Airport pickup, hotel check-in"},{day:"Day 2",title:"CIOE Day 1",description:"Exhibition access, networking dinner"},{day:"Day 3",title:"B2B Day",description:"Matchmaking, supplier meetings"},{day:"Day 4",title:"Electronics Market",description:"Huaqiangbei tour"},{day:"Day 5",title:"Factory Visits",description:"Dongguan manufacturing"},{day:"Day 6",title:"Departure",description:"Free time, airport transfer"}],
    price: 2200, currency: "USD", groupSize: "10-20 travelers",
    included: ["5 nights 4-star hotel","Breakfast & 2 dinners","Transport","Exhibition pass","Guide","Factory visits"],
    notIncluded: ["Flights","Insurance","Personal expenses","Lunch"],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop&q=80", exhibitionSlug: "cioe-2026-shenzhen" },
  { id: "bt-3", slug: "caexpo-nanning-business-tour-2026", title: "CAEXPO Nanning Business Tour 2026", type: "business", city: "Nanning", dates: "September 15-21, 2026", startDate: "2026-09-15", endDate: "2026-09-21", duration: "7 days / 6 nights",
    description: "Visit the 23rd China-ASEAN Expo (CAEXPO) in Nanning.",
    highlights: ["Full CAEXPO access", "ASEAN-China matching", "Investment forums", "Nanning markets", "Guangxi culture", "Professional interpreter"],
    itinerary: [{day:"Day 1",title:"Arrival",description:"Airport pickup, hotel, reception"},{day:"Day 2",title:"CAEXPO Day 1",description:"Opening, exhibition tour"},{day:"Day 3",title:"B2B Sessions",description:"Buyer-supplier meetings"},{day:"Day 4",title:"Investment Forums",description:"Promotion conferences"},{day:"Day 5",title:"Nanning Markets",description:"Wholesale markets tour"},{day:"Day 6",title:"Cultural Day",description:"Minority villages, cuisine"},{day:"Day 7",title:"Departure",description:"Airport transfer"}],
    price: 2400, currency: "USD", groupSize: "12-20 travelers",
    included: ["6 nights 4-star hotel","Breakfast & 3 dinners","Transport","Exhibition pass","Interpreter","Cultural tours"],
    notIncluded: ["Flights","Insurance","Personal expenses","Lunch"],
    image: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=500&fit=crop&q=80", exhibitionSlug: "caexpo-2026-nanning" },
];

export const chinaTours: Tour[] = [
  { id: "ct-1", slug: "shanghai-guangzhou-trade-hub-tour", title: "Shanghai & Guangzhou Trade Hub Tour", type: "china", city: "Shanghai / Guangzhou", dates: "October 10-20, 2026", startDate: "2026-10-10", endDate: "2026-10-20", duration: "11 days / 10 nights",
    description: "Comprehensive tour of China two biggest trade hubs.",
    highlights: ["Shanghai Bund & Yuyuan", "Guangzhou Canton Fair", "Foshan factories", "High-speed rail", "Food tours", "Wholesale markets"],
    itinerary: [{day:"Day 1-2",title:"Shanghai",description:"Bund, Yu Garden, Nanjing Road"},{day:"Day 3-4",title:"Trade Zone",description:"Hongqiao NECC, suppliers"},{day:"Day 5",title:"Hangzhou",description:"West Lake, tea plantations"},{day:"Day 6",title:"Fly South",description:"Guangzhou arrival, Tower views"},{day:"Day 7-8",title:"Guangzhou",description:"Baiyun markets, wholesale"},{day:"Day 9",title:"Foshan",description:"Factory visits"},{day:"Day 10",title:"Free Day",description:"Shopping, farewell dinner"},{day:"Day 11",title:"Departure",description:"Airport transfer"}],
    price: 3200, currency: "USD", groupSize: "10-20 travelers",
    included: ["10 nights 4-star hotel","Breakfast & 4 dinners","Flights & rail","Transport","Guide","Factories"],
    notIncluded: ["International flights","Insurance","Personal expenses","Lunch"],
    image: "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=800&h=500&fit=crop&q=80" },
  { id: "ct-2", slug: "yiwu-foreign-trade-market-tour", title: "Yiwu & Foreign Trade Market Tour", type: "china", city: "Yiwu", dates: "November 5-12, 2026", startDate: "2026-11-05", endDate: "2026-11-12", duration: "8 days / 7 nights",
    description: "Discover Yiwu, the world largest small commodities market.",
    highlights: ["75,000+ booths", "Factory visits", "Sourcing guidance", "Export zone tour", "Night market", "Sourcing agents"],
    itinerary: [{day:"Day 1",title:"Arrival",description:"Airport pickup, hotel"},{day:"Day 2-3",title:"Trade City",description:"Districts 1-5 tours"},{day:"Day 4",title:"Factories",description:"Industrial zone visits"},{day:"Day 5",title:"Workshop",description:"Negotiation, quality inspection"},{day:"Day 6",title:"Markets",description:"Jinhua, night market"},{day:"Day 7",title:"Free Day",description:"Independent sourcing"},{day:"Day 8",title:"Departure",description:"Transfer to Hangzhou"}],
    price: 2600, currency: "USD", groupSize: "8-15 travelers",
    included: ["7 nights 3-4 star hotel","Breakfast & 3 dinners","Transfers","Guide","Factories","Market maps"],
    notIncluded: ["Flights","Insurance","Personal expenses","Lunch"],
    image: "https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=800&h=500&fit=crop&q=80" },
];

export function getAllTours(): Tour[] { return [...businessTours, ...chinaTours]; }
export function getTourBySlug(slug: string): Tour | undefined { return getAllTours().find(t => t.slug === slug); }
