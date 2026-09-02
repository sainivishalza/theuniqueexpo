"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { SITE_PAGES } from "@/lib/site-pages";

export default function AdminSitePagesIndex() {
  const t = useTranslations("adminPagesIndex");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 grid gap-4 sm:grid-cols-2">
          {SITE_PAGES.map((p) => (
            <Link
              key={p.slug}
              href={`/admin/pages/${p.slug}`}
              className="flex items-center justify-between p-5 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover"
            >
              <div>
                <h3 className="font-bold text-gray-900">{p.navLabel}</h3>
                <p className="text-xs text-gray-400 mt-1">{p.path}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-600">{ta("edit")}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
