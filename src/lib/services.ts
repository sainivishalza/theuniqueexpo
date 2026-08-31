export interface ServiceCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  image: string;
  features: string[];
  ctaText: string;
  color: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "business-tours",
    slug: "business-tours",
    title: "Business Tours",
    icon: "✈️",
    description: "All-inclusive business tour packages to China's top trade fairs. We handle tickets, hotels, exhibition registration, escorts, interpreters, and factory visits.",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=500&fit=crop&q=80",
    features: [
      "Round-trip flight tickets",
      "Hotel accommodation (3-5 star)",
      "Exhibition registration & passes",
      "Visa documentation support",
      "Professional escort & guide",
      "Mandarin/English interpreter",
      "Factory & warehouse visits",
      "Airport transfers & logistics",
    ],
    ctaText: "Book a Business Tour",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    id: "china-tours",
    slug: "china-tours",
    title: "Tours of China",
    icon: "🇨🇳",
    description: "Curated tour packages covering China's major cities, trade hubs, and cultural landmarks. Perfect for first-time visitors and repeat buyers.",
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop&q=80",
    features: [
      "Guided city tours (Beijing, Shanghai, Guangzhou, Shenzhen)",
      "Trade hub visits (Yiwu, Linyi,义乌)",
      "Cultural experiences & sightseeing",
      "Factory visits in manufacturing zones",
      "Local cuisine tours",
      "Shopping districts & wholesale markets",
      "Flexible 5-14 day itineraries",
      "Group & private tour options",
    ],
    ctaText: "Explore China Tours",
    color: "from-red-500 to-rose-600",
  },
  {
    id: "visa-setup",
    slug: "visa-setup",
    title: "Company Setup & Visas",
    icon: "📋",
    description: "End-to-end assistance with setting up a business in China and obtaining the right visas for trade activities.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848e968838?w=800&h=500&fit=crop&q=80",
    features: [
      "Company registration in China (WFOE, JV, Representative Office)",
      "Business visa (M-visa) application support",
      "Work permit & Z-visa processing",
      "Trade license applications",
      "Bank account setup assistance",
      "Legal consultation & compliance",
      "Registered address services",
      "Annual filing & tax advisory",
    ],
    ctaText: "Get Started",
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "moving",
    slug: "moving-assistance",
    title: "Moving Assistance",
    icon: "📦",
    description: "Comprehensive relocation support for businesses and individuals moving to or from China. We handle logistics, paperwork, and settlement.",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=500&fit=crop&q=80",
    features: [
      "International freight forwarding",
      "Customs clearance & documentation",
      "Office relocation services",
      "Residential moving support",
      "Temporary storage solutions",
      "Insurance & liability coverage",
      "Settling-in services (bank, SIM, housing)",
      "Pet relocation assistance",
    ],
    ctaText: "Request Moving Quote",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "consultation",
    slug: "consultation",
    title: "Consultation on China",
    icon: "💬",
    description: "One-on-one expert consultations on doing business in China — market entry, sourcing, legal, cultural, and trade compliance guidance.",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop&q=80",
    features: [
      "Market entry strategy consulting",
      "Supplier sourcing & verification",
      "Product sourcing & quality inspection",
      "Legal & regulatory compliance",
      "Cultural etiquette & negotiation tips",
      "Trade compliance & customs guidance",
      "Intellectual property protection",
      "Ongoing advisory retainer options",
    ],
    ctaText: "Book Consultation",
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "subsidies",
    slug: "transport-subsidies",
    title: "Transport Subsidies",
    icon: "🚌",
    description: "Government and organizer-backed transport subsidies for exhibitors and buyers attending major trade fairs across China.",
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&h=500&fit=crop&q=80",
    features: [
      "Domestic flight subsidies for exhibitors",
      "High-speed rail reimbursement programs",
      "Hotel accommodation subsidies",
      "Airport transfer vouchers",
      "Group travel discount programs",
      "Early-bird registration subsidies",
      "Exhibitor booth travel grants",
      "Buyer attendance support funds",
    ],
    ctaText: "Check Eligibility",
    color: "from-cyan-500 to-teal-600",
  },
];

export function getServiceBySlug(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((s) => s.slug === slug);
}
