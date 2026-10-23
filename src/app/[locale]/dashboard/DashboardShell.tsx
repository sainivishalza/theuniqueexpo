"use client";

import { useTranslations } from "next-intl";
import AppShell, { type ShellItem } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { shellAppliesTo } from "@/lib/app-shell";
import { formatNumber } from "@/lib/format";
import { useWalletBalance } from "@/lib/client/wallet-balance";
import WalletChip from "@/components/wallet/WalletChip";
import { useUnreadNotifications } from "@/lib/client/unread-notifications";

// The signed-in customer's frame: a list of their tools down the left on a laptop,
// the menu on a phone. Links to public pages (exhibitions, messages, ...) simply
// open the website itself.
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const tb = useTranslations("buyerDashboard");
  const te = useTranslations("exhibitorDashboard");
  const tc = useTranslations("common");
  const tp = useTranslations("accountPassword");
  const tn = useTranslations("notificationsPage");
  const { user, loading } = useAuth();
  // A buyer sees their wallet balance in the phone top bar and next to "Rewards Wallet" in the menu.
  const wallet = useWalletBalance(!!user && user.role === "buyer");
  // The number of unread website notifications shows next to "Notifications" in the menu.
  const { unread } = useUnreadNotifications(!!user);
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
      { key: "myWallet", href: "/dashboard/buyer/wallet", label: tb("actions.myWallet.title"), icon: "💰", group: "account", meta: wallet ? formatNumber(wallet.balance) : undefined },
      { key: "browseExhibitions", href: "/exhibitions", label: tb("actions.browseExhibitions.title"), icon: "🎯", group: "explore" },
      { key: "savedExhibitions", href: "/favorites", label: tb("actions.savedExhibitions.title"), icon: "❤️", group: "explore" },
      { key: "messages", href: "/messages", label: tb("actions.messages.title"), icon: "💬", group: "explore" },
      { key: "postBuyRequest", href: "/marketplace/new", label: tb("actions.postBuyRequest.title"), icon: "📋", group: "explore" },
      { key: "marketplace", href: "/marketplace", label: tb("actions.marketplace.title"), icon: "🛒", group: "explore" },
      { key: "account", href: "/dashboard/account", label: tp("menu"), icon: "🔑", group: "account" },
    ];
  } else if (role === "exhibitor") {
    homeHref = "/dashboard/exhibitor";
    items = [
      { key: "home", href: homeHref, label: tc("shell.dashboard"), icon: "🏠" },
      { key: "browseExhibitions", href: "/exhibitions", label: te("browseExhibitions"), icon: "🎯", group: "explore" },
      { key: "messages", href: "/messages", label: tb("actions.messages.title"), icon: "💬", group: "explore" },
      { key: "account", href: "/dashboard/account", label: tp("menu"), icon: "🔑", group: "account" },
    ];
  } else {
    homeHref = "/dashboard/partner";
    items = [
      { key: "home", href: homeHref, label: tc("shell.dashboard"), icon: "🏠" },
      { key: "account", href: "/dashboard/account", label: tp("menu"), icon: "🔑", group: "account" },
    ];
  }

  // Right under "Dashboard" so a new message is the first thing seen in the menu.
  items.splice(1, 0, { key: "notifications", href: "/dashboard/notifications", label: tn("menu"), icon: "🔔", count: unread });

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
      headerExtra={wallet ? <WalletChip balance={wallet.balance} ariaLabel={tb("wallet.chipAria", { points: formatNumber(wallet.balance) })} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
