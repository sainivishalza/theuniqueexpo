// The root layout ships next-intl's `messages` object to every single page
// via NextIntlClientProvider, including admin CRUD forms and role dashboards
// that only ever render behind /admin or /dashboard -- roughly 38% of the
// whole messages bundle by size. Public pages (including the homepage) were
// shipping all of that to the client for no reason. Splitting it out: the
// root provider omits these namespaces, and /admin and /dashboard each get
// their own nested provider that adds them back just for that subtree.

export const ADMIN_NAMESPACES = [
  "adminAbout", "adminBlogCrud", "adminCommon", "adminCompanyProfile", "adminConsultations",
  "adminEventRegistrations", "adminEventsCrud", "adminExhibitionRegForm", "adminExhibitionRegistrations",
  "adminExhibitionsCrud", "adminFaq", "adminHome", "adminHotels", "adminMovingQuotes", "adminPagesIndex",
  "adminRegFormBuilder", "adminRegistrationsCommon", "adminRfqs", "adminServiceTours", "adminServicesHome",
  "adminPartnerApplications", "adminPartnerTiers",
  "adminSitePageEditor", "adminSiteTheme", "adminSubsidies", "adminSubsidyApplications", "adminTeam", "adminTourApplications",
  "adminTourRegForm", "adminTourRegistrations", "adminToursCrud", "adminVisaApplications",
];

export const DASHBOARD_NAMESPACES = [
  "buyerDashboard", "exhibitorDashboard", "partnerDashboard", "visitorDashboard",
];

export function pickMessages<T extends Record<string, unknown>>(messages: T, namespaces: string[]): Partial<T> {
  const picked: Partial<T> = {};
  for (const ns of namespaces) {
    if (ns in messages) picked[ns as keyof T] = messages[ns as keyof T];
  }
  return picked;
}

export function omitMessages<T extends Record<string, unknown>>(messages: T, namespaces: string[]): Partial<T> {
  const omit = new Set(namespaces);
  const result: Partial<T> = {};
  for (const key of Object.keys(messages)) {
    if (!omit.has(key)) result[key as keyof T] = messages[key as keyof T];
  }
  return result;
}
