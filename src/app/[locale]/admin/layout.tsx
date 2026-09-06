import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ADMIN_NAMESPACES, pickMessages } from "@/lib/client-message-namespaces";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The root layout omits admin namespaces from its client message bundle
  // (see src/lib/client-message-namespaces.ts) -- add them back just for
  // this subtree. "common" is also used by admin client components, so it
  // needs to be included here too rather than relying on the (now-trimmed)
  // root provider.
  const messages = await getMessages();
  const adminMessages = pickMessages(messages, [...ADMIN_NAMESPACES, "common"]);

  return <NextIntlClientProvider messages={adminMessages}>{children}</NextIntlClientProvider>;
}
