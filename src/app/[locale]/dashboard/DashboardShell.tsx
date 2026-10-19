"use client";

import { useTranslations } from "next-intl";
import AppShell, { type ShellItem } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { shellAppliesTo } from "@/lib/app-shell";

// The signed-in customer's frame: a list of their tools down the left on a laptop,
// the menu on a phone. Links to public pages (exhibitions, messages, ...) simply
// open the website itself.
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const tb = useTranslations("buyerDashboard");
  const te = useTranslations("exhibitorDashboard");
  const tc = useTranslations("common");
  const { user, loading } = useAuth();
  if (loading || !user || !shellAppliesTo("dashboard", user)) return <>{children}</>;

  const role = user.role;
  let items: ShellItem[];
  let homeHref: string;
  if (role === "buyer") {
    homeHref = "/dashboard/buyer";
    items = [
      { key: "home", href: homeHref, label: tc("shell.dashboard"), icon: "🏠" },
      { key: "myProfile", href: "/dashboard/buyer/profile", label: tb("actions.myProfile.title"), icon: "🪪", group: "account" },
      { key: "myRegistrations", href: "/dashboard/buyer/registrations", label: tb("actions.myRegistrations.title"), icon: "🎫", group: "account" },
      { key: "myWallet", href: "/dashboard/buyer/wallet", label: tb("actions.myWallet.title"), icon: "💰", group: "account" },
      { key: "browseExhibitions", href: "/exhibitions", label: tb("actions.browseExhibitions.title"), icon: "🎯", group: "explore" },
      { key: "savedExhibitions", href: "/favorites", label: tb("actions.savedExhibitions.title"), icon: "❤️", group: "explore" },
      { key: "messages", href: "/messages", label: tb("actions.messages.title"), icon: "💬", group: "explore" },
      { key: "postBuyRequest", href: "/marketplace/new", label: tb("actions.postBuyRequest.title"), icon: "📋", group: "explore" },
      { key: "marketplace", href: "/marketplace", label: tb("actions.marketplace.title"), icon: "🛒", group: "explore" },
    ];
  } else if (role === "exhibitor") {
    homeHref = "/dashboard/exhibitor";
    items = [
      { key: "home", href: homeHref, label: tc("shell.dashboard"), icon: "🏠" },
      { key: "browseExhibitions", href: "/exhibitions", label: te("browseExhibitions"), icon: "🎯", group: "explore" },
      { key: "messages", href: "/messages", label: tb("actions.messages.title"), icon: "💬", group: "explore" },
    ];
  } else {
    homeHref = "/dashboard/partner";
    items = [{ key: "home", href: homeHref, label: tc("shell.dashboard"), icon: "🏠" }];
  }

  return (
    <AppShell
      areaLabel={tc("shell.areas.dashboard")}
      badge={tc(`shell.roles.${role}`)}
      items={items}
      groups={[
        { key: "account", label: tc("shell.groups.account") },
        { key: "explore", label: tc("shell.groups.explore") },
      ]}
      homeHref={homeHref}
    >
      {children}
    </AppShell>
  );
}
