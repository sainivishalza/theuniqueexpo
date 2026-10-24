// The admin back office's sections, in one place: the dashboard tiles and the
// side/phone menu both read this list, so a new section only needs adding here
// (plus its title/description under adminHome.sections in the messages).

export interface AdminSection {
  key: string;
  href: string;
  icon: string;
  color: string;
  /** Which menu heading the section sits under. */
  group: "events" | "people" | "requests" | "content" | "settings";
}

export const ADMIN_GROUPS: AdminSection["group"][] = ["events", "people", "requests", "content", "settings"];

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "exhibitionManagement", href: "/admin/exhibitions", icon: "🎪", color: "from-emerald-500 to-emerald-600", group: "events" },
  { key: "allRegistrations", href: "/admin/registrations", icon: "📝", color: "from-emerald-600 to-teal-600", group: "events" },
  { key: "insights", href: "/admin/insights", icon: "📊", color: "from-indigo-500 to-emerald-600", group: "events" },
  { key: "duplicates", href: "/admin/duplicates", icon: "👯", color: "from-amber-500 to-orange-600", group: "people" },
  { key: "ticketCheck", href: "/admin/ticket-check", icon: "🎫", color: "from-teal-600 to-emerald-700", group: "events" },
  { key: "tourManagement", href: "/admin/tours", icon: "🧳", color: "from-cyan-500 to-blue-600", group: "events" },
  { key: "eventManagement", href: "/admin/events", icon: "🎉", color: "from-pink-500 to-rose-600", group: "events" },
  { key: "blogManagement", href: "/admin/blog", icon: "📰", color: "from-indigo-500 to-purple-600", group: "content" },
  { key: "rfqReview", href: "/admin/rfqs", icon: "📋", color: "from-purple-500 to-purple-600", group: "requests" },
  { key: "hotelBookings", href: "/admin/hotels", icon: "🏨", color: "from-amber-500 to-yellow-600", group: "events" },
  { key: "servicesManagement", href: "/admin/services", icon: "🛠️", color: "from-violet-500 to-purple-600", group: "requests" },
  { key: "aboutUsPage", href: "/admin/about", icon: "📝", color: "from-blue-500 to-cyan-600", group: "content" },
  { key: "teamManagement", href: "/admin/team", icon: "🧑‍🤝‍🧑", color: "from-lime-500 to-emerald-600", group: "content" },
  { key: "partnerProgram", href: "/admin/partner-tiers", icon: "🤝", color: "from-indigo-500 to-blue-600", group: "requests" },
  { key: "magazineManagement", href: "/admin/magazine", icon: "📰", color: "from-rose-500 to-pink-600", group: "content" },
  { key: "videoManagement", href: "/admin/videos", icon: "🎬", color: "from-red-500 to-rose-600", group: "content" },
  { key: "cityPartnershipInquiries", href: "/admin/city-partnership-inquiries", icon: "🏙️", color: "from-sky-500 to-cyan-600", group: "requests" },
  { key: "businessTripInquiries", href: "/admin/business-trip-inquiries", icon: "🧳", color: "from-teal-500 to-cyan-700", group: "requests" },
  { key: "newsletter", href: "/admin/newsletter", icon: "✉️", color: "from-gold-500 to-amber-600", group: "requests" },
  { key: "partnerInquiries", href: "/admin/partner-inquiries", icon: "🤝", color: "from-indigo-500 to-violet-600", group: "requests" },
  { key: "chinaTravel", href: "/admin/china-travel", icon: "🗺️", color: "from-amber-500 to-orange-600", group: "events" },
  { key: "photoOrganizer", href: "/admin/photo-organizer", icon: "🗂️", color: "from-slate-500 to-gray-600", group: "content" },
  { key: "websitePages", href: "/admin/pages", icon: "📄", color: "from-sky-500 to-indigo-600", group: "content" },
  { key: "companyProfile", href: "/admin/company-profile", icon: "🏢", color: "from-teal-500 to-emerald-600", group: "settings" },
  { key: "faqManagement", href: "/admin/faq", icon: "❓", color: "from-rose-500 to-pink-600", group: "content" },
  { key: "staffAccess", href: "/admin/staff-access", icon: "🛡️", color: "from-slate-600 to-gray-700", group: "settings" },
  { key: "myAccount", href: "/admin/account", icon: "🔑", color: "from-slate-500 to-gray-600", group: "settings" },
  { key: "errors", href: "/admin/errors", icon: "🐞", color: "from-red-500 to-rose-600", group: "settings" },
  { key: "health", href: "/admin/health", icon: "🩺", color: "from-emerald-500 to-teal-600", group: "settings" },
  { key: "dataRetention", href: "/admin/data-retention", icon: "🧹", color: "from-slate-500 to-gray-700", group: "settings" },
  { key: "documentProtection", href: "/admin/document-protection", icon: "🔐", color: "from-red-500 to-rose-700", group: "settings" },
  { key: "pictures", href: "/admin/image-optimizer", icon: "🖼️", color: "from-cyan-500 to-sky-600", group: "settings" },
  { key: "guide", href: "/admin/guide", icon: "📖", color: "from-emerald-500 to-green-600", group: "settings" },
  { key: "pageSpeed", href: "/admin/page-speed", icon: "⚡", color: "from-amber-500 to-yellow-600", group: "settings" },
  { key: "slowQueries", href: "/admin/slow-queries", icon: "🐢", color: "from-slate-500 to-gray-600", group: "settings" },
  { key: "scheduledExports", href: "/admin/scheduled-exports", icon: "🗓️", color: "from-sky-500 to-indigo-600", group: "settings" },
  { key: "email", href: "/admin/email", icon: "✉️", color: "from-sky-500 to-blue-600", group: "settings" },
  { key: "activity", href: "/admin/activity", icon: "🕵️", color: "from-slate-500 to-gray-700", group: "settings" },
  { key: "siteTheme", href: "/admin/site-theme", icon: "🎨", color: "from-fuchsia-500 to-purple-600", group: "settings" },
  { key: "userManagement", href: "/admin/users", icon: "👥", color: "from-orange-500 to-red-500", group: "people" },
  { key: "buyerProfiles", href: "/admin/buyer-profiles", icon: "🪪", color: "from-emerald-600 to-teal-700", group: "people" },
  { key: "buyerExpos", href: "/admin/buyer-expos", icon: "🏷️", color: "from-teal-600 to-emerald-700", group: "people" },
  { key: "buyerForm", href: "/admin/buyer-form", icon: "🧾", color: "from-teal-600 to-cyan-700", group: "people" },
  { key: "rewardsWallet", href: "/admin/wallet", icon: "💰", color: "from-amber-500 to-yellow-600", group: "people" },
  { key: "support", href: "/admin/support", icon: "💬", color: "from-sky-500 to-blue-600", group: "people" },
  { key: "homepageSlideshow", href: "/admin/slideshow", icon: "🖼️", color: "from-cyan-500 to-teal-600", group: "content" },
];
