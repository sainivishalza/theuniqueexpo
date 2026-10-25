"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { useStaffPreset } from "@/lib/client/staff-role";
import { canOpenAdminPage, type StaffPreset } from "@/lib/staff-access";

// What each kind of staff member does day to day, step by step, with a link to the screen. A person sees the parts for their own
// role (someone with full access sees all of them); a link only appears where their role may open that screen. The wording of
// every task is in the messages (adminGuide.tasks.<key>), steps separated by line breaks.
type Role = "everyone" | "reviewer" | "content" | "finance" | "viewer";
interface Task { key: string; href: string }

const GUIDE: { role: Role; tasks: Task[] }[] = [
  { role: "everyone", tasks: [{ key: "twoStep", href: "/admin/account" }, { key: "findThings", href: "/admin" }] },
  { role: "reviewer", tasks: [
    { key: "approve", href: "/admin/registrations" }, { key: "documents", href: "/admin/buyer-profiles" }, { key: "announce", href: "/admin/buyer-profiles" },
    { key: "doorCheck", href: "/admin/ticket-check" }, { key: "exportList", href: "/admin/registrations" }, { key: "support", href: "/admin/support" },
  ] },
  { role: "content", tasks: [
    { key: "addExhibition", href: "/admin/exhibitions" }, { key: "editPages", href: "/admin/pages" }, { key: "helpAnswers", href: "/admin/pages" }, { key: "blog", href: "/admin/blog" },
  ] },
  { role: "finance", tasks: [
    { key: "topups", href: "/admin/wallet" }, { key: "withdrawals", href: "/admin/wallet" }, { key: "expenses", href: "/admin/wallet" },
    { key: "topupMany", href: "/admin/wallet" }, { key: "ticketInvoice", href: "/admin/wallet" }, { key: "statement", href: "/admin/wallet" }, { key: "scheduled", href: "/admin/scheduled-exports" },
  ] },
  { role: "viewer", tasks: [{ key: "look", href: "/admin/registrations" }, { key: "numbers", href: "/admin/insights" }] },
];

export default function AdminGuidePage() {
  const t = useTranslations("adminGuide");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const { preset, loaded } = useStaffPreset(user?.role === "admin");

  if (authLoading || !loaded) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  const shows = (role: Role, p: StaffPreset) => role === "everyone" || p === "full" || p === role;
  const parts = GUIDE.filter((g) => shows(g.role, preset));

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          {preset !== "full" && <p className="rounded-xl bg-white p-4 text-sm text-gray-800 shadow-sm" data-testid="guide-role">{t("yourRole", { role: t(`roles.${preset}.name`) })}</p>}
          {parts.map((part) => (
            <div key={part.role} data-testid={`guide-${part.role}`}>
              <h2 className="text-xl font-bold text-heading">{t(`roles.${part.role}.name`)}</h2>
              <p className="mt-1 text-sm text-gray-700">{t(`roles.${part.role}.about`)}</p>
              <ul className="mt-3 space-y-3">
                {part.tasks.map((task) => (
                  <li key={task.key} className="rounded-2xl bg-white p-5 shadow-sm" data-testid={`task-${task.key}`}>
                    <h3 className="font-bold text-heading">{t(`tasks.${task.key}.title`)}</h3>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-800">
                      {t(`tasks.${task.key}.steps`).split("\n").map((step) => <li key={step}>{step}</li>)}
                    </ol>
                    {canOpenAdminPage(preset, task.href) && (
                      <p className="mt-3"><Link href={task.href} className="py-1 text-sm font-semibold text-emerald-800 underline">{t(`tasks.${task.key}.open`)}</Link></p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
