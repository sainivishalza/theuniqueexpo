export interface ConferenceHostingBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface ConferenceHostingContent {
  title: string;
  subtitle: string;
  heroImage: string;
  included: ConferenceHostingBenefit[];
}

export const DEFAULT_CONFERENCE_HOSTING_CONTENT: ConferenceHostingContent = {
  title: "Conference & Forum Hosting",
  subtitle: "Bring your own conference, forum, or summit to life -- we handle the venue, registration, attendee logistics, and on-site staffing.",
  heroImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=600&fit=crop&q=80",
  included: [
    { icon: "📍", title: "Venue Sourcing", desc: "Access to venues across our exhibition network in major Chinese cities." },
    { icon: "💻", title: "Registration Website", desc: "A branded, custom registration site for your attendees." },
    { icon: "📋", title: "Attendee Management", desc: "Check-in, badges, and speaker/session scheduling." },
    { icon: "🏨", title: "Hotel & Tour Bundling", desc: "Accommodation and city tours for out-of-town guests." },
    { icon: "👥", title: "On-Site Staffing", desc: "Registration desks, translators, and event-day support." },
    { icon: "🤝", title: "Sponsorship Packaging", desc: "Help structuring and selling sponsorship tiers." },
  ],
};

function isBenefit(value: unknown): value is ConferenceHostingBenefit {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.title === "string" && typeof record.desc === "string";
}

export function normalizeConferenceHostingContent(input: unknown): ConferenceHostingContent {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    title: typeof record.title === "string" ? record.title : DEFAULT_CONFERENCE_HOSTING_CONTENT.title,
    subtitle: typeof record.subtitle === "string" ? record.subtitle : DEFAULT_CONFERENCE_HOSTING_CONTENT.subtitle,
    heroImage: typeof record.heroImage === "string" ? record.heroImage : DEFAULT_CONFERENCE_HOSTING_CONTENT.heroImage,
    included: Array.isArray(record.included)
      ? record.included.filter(isBenefit).map((b) => ({ icon: b.icon || "✨", title: b.title, desc: b.desc }))
      : DEFAULT_CONFERENCE_HOSTING_CONTENT.included,
  };
}
