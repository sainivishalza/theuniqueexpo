export interface ServiceCategory {
  id: string;
  slug: string;
  titleKey: string;
  icon: string;
  descriptionKey: string;
  image: string;
  featureKeys: string[];
  ctaKey: string;
  color: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "business-tours",
    slug: "business-tours",
    titleKey: "businessTours.title",
    icon: "✈️",
    descriptionKey: "businessTours.description",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "businessTours.features.0",
      "businessTours.features.1",
      "businessTours.features.2",
      "businessTours.features.3",
      "businessTours.features.4",
      "businessTours.features.5",
      "businessTours.features.6",
      "businessTours.features.7",
    ],
    ctaKey: "businessTours.cta",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    id: "china-tours",
    slug: "china-tours",
    titleKey: "chinaTours.title",
    icon: "🇨🇳",
    descriptionKey: "chinaTours.description",
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "chinaTours.features.0",
      "chinaTours.features.1",
      "chinaTours.features.2",
      "chinaTours.features.3",
      "chinaTours.features.4",
      "chinaTours.features.5",
      "chinaTours.features.6",
      "chinaTours.features.7",
    ],
    ctaKey: "chinaTours.cta",
    color: "from-red-500 to-rose-600",
  },
  {
    id: "visa-setup",
    slug: "visa-setup",
    titleKey: "visaSetup.title",
    icon: "📋",
    descriptionKey: "visaSetup.description",
    image: "https://images.unsplash.com/photo-1450101499163-c8848e968838?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "visaSetup.features.0",
      "visaSetup.features.1",
      "visaSetup.features.2",
      "visaSetup.features.3",
      "visaSetup.features.4",
      "visaSetup.features.5",
      "visaSetup.features.6",
      "visaSetup.features.7",
    ],
    ctaKey: "visaSetup.cta",
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "moving",
    slug: "moving-assistance",
    titleKey: "moving.title",
    icon: "📦",
    descriptionKey: "moving.description",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "moving.features.0",
      "moving.features.1",
      "moving.features.2",
      "moving.features.3",
      "moving.features.4",
      "moving.features.5",
      "moving.features.6",
      "moving.features.7",
    ],
    ctaKey: "moving.cta",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "consultation",
    slug: "consultation",
    titleKey: "consultation.title",
    icon: "💬",
    descriptionKey: "consultation.description",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "consultation.features.0",
      "consultation.features.1",
      "consultation.features.2",
      "consultation.features.3",
      "consultation.features.4",
      "consultation.features.5",
      "consultation.features.6",
      "consultation.features.7",
    ],
    ctaKey: "consultation.cta",
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "subsidies",
    slug: "transport-subsidies",
    titleKey: "subsidies.title",
    icon: "🚌",
    descriptionKey: "subsidies.description",
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&h=500&fit=crop&q=80",
    featureKeys: [
      "subsidies.features.0",
      "subsidies.features.1",
      "subsidies.features.2",
      "subsidies.features.3",
      "subsidies.features.4",
      "subsidies.features.5",
      "subsidies.features.6",
      "subsidies.features.7",
    ],
    ctaKey: "subsidies.cta",
    color: "from-cyan-500 to-teal-600",
  },
];

export function getServiceBySlug(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((s) => s.slug === slug);
}
