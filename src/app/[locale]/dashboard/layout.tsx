import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { DASHBOARD_NAMESPACES, pickMessages } from "@/lib/client-message-namespaces";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The root layout omits dashboard namespaces from its client message
  // bundle (see src/lib/client-message-namespaces.ts) -- add them back just
  // for this subtree. "common" is also used by dashboard client components.
  const messages = await getMessages();
  const dashboardMessages = pickMessages(messages, [...DASHBOARD_NAMESPACES, "common"]);

  return <NextIntlClientProvider messages={dashboardMessages}>{children}</NextIntlClientProvider>;
}
