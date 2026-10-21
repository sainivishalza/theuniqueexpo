"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import AppShell, { type ShellItem } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_GROUPS, ADMIN_SECTIONS } from "@/lib/admin-nav";
import { shellAppliesTo } from "@/lib/app-shell";

// The admin back office's frame: every section down the left on a laptop, and the
// menu (search + two-column grid) on a phone. A visitor who is not an admin gets
// the page as it is, which shows its own "admin access required" message.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminHome");
  const tc = useTranslations("common");
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isAdmin = !loading && shellAppliesTo("admin", user);

  // How many rewards requests (top-ups, withdrawals, expense claims) are waiting, shown on the
  // menu entry. Looked up again on each page change and once a minute; a failure just hides it.
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    const load = () =>
      fetch("/api/admin/wallet/waiting")
        .then((r) => (r.ok ? r.json() : null))
        .then((o) => {
          if (live && o) setWaiting(Number(o.waiting) || 0);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [isAdmin, pathname]);

  if (!isAdmin) return <>{children}</>;

  const items: ShellItem[] = [
    { key: "dashboard", href: "/admin", label: tc("shell.dashboard"), icon: "🏠" },
    ...ADMIN_SECTIONS.map((s) => ({ key: s.key, href: s.href, label: t(`sections.${s.key}.title`), icon: s.icon, group: s.group, count: s.key === "rewardsWallet" ? waiting : undefined })),
  ];
  const groups = ADMIN_GROUPS.map((g) => ({ key: g, label: tc(`shell.groups.${g}`) }));

  return (
    <AppShell
      areaLabel={tc("shell.areas.admin")}
      badge={tc("shell.roles.admin")}
      items={items}
      groups={groups}
      homeHref="/admin"
      searchPlaceholder={tc("shell.adminSearchPlaceholder")}
      searchLinks={(q) => [
        { key: "find-buyers", href: `/admin/buyer-profiles?q=${encodeURIComponent(q)}`, label: tc("shell.findBuyers", { query: q }), icon: "🪪" },
        { key: "find-users", href: `/admin/users?q=${encodeURIComponent(q)}`, label: tc("shell.findUsers", { query: q }), icon: "👥" },
      ]}
    >
      {children}
    </AppShell>
  );
}
