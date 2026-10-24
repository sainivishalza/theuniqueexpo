"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSiteStats } from "@/lib/client/site-stats";
import { friendlyCount, showable } from "@/lib/site-stats-format";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { errorMessage, formatNumber } from "@/lib/format";
import { isValidReferralCode, type ReferralTrigger } from "@/lib/referral";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const ROLE_KEYS: { value: UserRole; icon: string }[] = [
  { value: "buyer", icon: "🛒" },
  { value: "exhibitor", icon: "🏢" },
  { value: "partner", icon: "🤝" },
];

export default function RegisterPage() {
  const t = useTranslations("registerPage");
  const locale = useLocale();
  // Real figures only (counted from the database); one that is still small is left out.
  const site = useSiteStats();
  const roles = ROLE_KEYS.map((r) => ({
    ...r,
    label: t(`roles.${r.value}.label`),
    desc: t(`roles.${r.value}.desc`),
  }));
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || undefined;
  // A buyer's invitation link carries their code; the sign-up page tells the newcomer what the invitation is worth.
  const inviteParam = searchParams.get("invite") || "";
  const invite = isValidReferralCode(inviteParam) ? inviteParam : undefined;
  const [offer, setOffer] = useState<{ enabled: boolean; referredPoints: number; trigger: ReferralTrigger } | null>(null);
  useEffect(() => {
    if (!invite) return;
    let stale = false;
    fetch("/api/referrals/offer")
      .then((res) => res.json())
      .then((data) => {
        if (!stale) setOffer(data);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [invite]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" as UserRole, country: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role, form.country, ref, form.role === "buyer" ? invite : undefined);
      router.push("/dashboard/" + form.role);
    } catch (err) {
      setError(errorMessage(err, t("registrationFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--color-hero-bg)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop&q=80"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Logo size="large" tone="onDark" />
          <h1 className="text-4xl font-extrabold mt-8 mb-4 leading-tight">{t("heroTitleLine1")}<br/>{t("heroTitleLine2")}<br/>{t("heroTitleLine3")}</h1>
          <p className="text-emerald-100 text-lg max-w-md">{t("heroSubtitle")}</p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {site && showable(site, "buyers") && <div><div className="text-3xl font-extrabold">{friendlyCount(site.buyers, locale)}</div><div className="text-sm text-emerald-200">{t("stats.users")}</div></div>}
            {site && showable(site, "buyerCountries") && <div><div className="text-3xl font-extrabold">{friendlyCount(site.buyerCountries, locale)}</div><div className="text-sm text-emerald-200">{t("stats.countries")}</div></div>}
            <div><div className="text-3xl font-extrabold">{t("stats.freeValue")}</div><div className="text-sm text-emerald-200">{t("stats.freeLabel")}</div></div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-cream-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-3xl font-extrabold text-heading mb-2">{t("createAccount")}</h2>
          <p className="text-gray-500 mb-8">{t("createAccountSubtitle")}</p>

          {invite && offer?.enabled && form.role === "buyer" && (
            <p role="status" data-testid="register-invited" className="mb-4 rounded-[var(--radius-button)] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {offer.referredPoints > 0 ? t("invitedBonus", { points: formatNumber(offer.referredPoints), trigger: offer.trigger }) : t("invited")}
            </p>
          )}
          {error && <div className="mb-4 p-3 rounded-[var(--radius-button)] bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Picker */}
            <div>
              <span id="signup-role-label" className="block text-sm font-medium text-gray-700 mb-2">{t("iAmA")}</span>
              <div role="group" aria-labelledby="signup-role-label" className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button key={r.value} type="button" aria-pressed={form.role === r.value} onClick={() => setForm({ ...form, role: r.value })}
                    className={`p-3 rounded-[var(--radius-card)] border-2 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${form.role === r.value ? "border-emerald-900 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <span className="text-xl">{r.icon}</span>
                    <div className="font-semibold text-sm mt-1">{r.label}</div>
                    <div className="text-xs text-gray-700">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <FormField label={t("fullName")} htmlFor="name">
              <input id="name" required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClasses()} />
            </FormField>
            <FormField label={t("email")} htmlFor="email">
              <input id="email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClasses()} placeholder="you@company.com" />
            </FormField>
            <FormField label={t("password")} htmlFor="password">
              <input id="password" required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClasses()} placeholder={t("passwordPlaceholder")} />
            </FormField>
            <FormField label={t("country")} htmlFor="country">
              <input id="country" type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldClasses()} placeholder={t("countryPlaceholder")} />
            </FormField>

            <Button type="submit" disabled={loading} variant="primary" size="blockMd">
              {loading ? t("creatingAccount") : t("createAccountButton")}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">{t("alreadyHaveAccount")}{" "}
              <Link href="/login" className="py-1 font-semibold text-emerald-600 hover:text-emerald-700">{t("signIn")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
