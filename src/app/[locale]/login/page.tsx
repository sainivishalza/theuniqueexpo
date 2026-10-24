"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSiteStats } from "@/lib/client/site-stats";
import { friendlyCount, showable } from "@/lib/site-stats-format";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { SecondStepError, useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";

export default function LoginPage() {
  const t = useTranslations("loginPage");
  const locale = useLocale();
  // Real figures only (counted from the database); one that is still small is left out.
  const site = useSiteStats();
  const tiles = site ? [
    ...(showable(site, "exhibitions") ? [{ value: friendlyCount(site.exhibitions, locale), label: t("stats.exhibitions") }] : []),
    ...(showable(site, "tours") ? [{ value: friendlyCount(site.tours, locale), label: t("stats.tours") }] : []),
  ] : [];
  const { login, loginWithCode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  // An admin with two-step sign-in on gets a second screen for the code from the authenticator app.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [contact, setContact] = useState<{ contactEmail: string; phone: string } | null>(null);
  // When the site can send e-mail, "Forgot password?" sends a reset link; otherwise it shows who to ask.
  const [mailOn, setMailOn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/forgot-password")
      .then((r) => r.json())
      .then((d) => setMailOn(!!d.enabled))
      .catch(() => {});
  }, []);

  // Without e-mail an admin resets a password on request (see /admin/users), so "forgot
  // password" then just points the account owner at a real human to ask, using whatever
  // contact details are already public on the site (no new API needed).
  useEffect(() => {
    if (!showForgot || contact) return;
    fetch("/api/company-profile")
      .then((r) => r.json())
      .then((data) => setContact({ contactEmail: data.profile?.contactEmail || "", phone: data.profile?.phone || "" }))
      .catch(() => setContact({ contactEmail: "", phone: "" }));
  }, [showForgot, contact]);

  // ?next= lets a page that asked for a sign-in (e.g. the venue check-in QR code)
  // bring the visitor back. Only a path inside this site is followed.
  const goOn = () => {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    router.push(/^\/(?![/\\])/.test(next) ? next : "/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const second = await login(email, password);
      if (second) {
        setChallenge(second.challenge);
        return;
      }
      goOn();
    } catch (err) {
      setError(errorMessage(err, t("loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setError("");
    setLoading(true);
    try {
      await loginWithCode(challenge, code.trim());
      goOn();
    } catch (err) {
      const reason = err instanceof SecondStepError ? err.code : "";
      if (reason === "expired") {
        setChallenge(null);
        setCode("");
        setPassword("");
      }
      setError(reason === "wrong_code" ? t(useRecovery ? "secondStep.wrongRecovery" : "secondStep.wrongCode") : reason === "expired" ? t("secondStep.expired") : reason === "rate_limited" ? t("secondStep.rateLimited") : t("loginFailed"));
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
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop&q=80"
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
          {tiles.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-6" data-testid="site-figures">
              {tiles.map((x) => <div key={x.label}><div className="text-3xl font-extrabold">{x.value}</div><div className="text-sm text-emerald-200">{x.label}</div></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-cream-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          {challenge ? (
            <>
              <h2 className="text-3xl font-extrabold text-heading mb-2">{t("secondStep.title")}</h2>
              <p className="text-gray-500 mb-8">{useRecovery ? t("secondStep.recoverySubtitle") : t("secondStep.subtitle")}</p>
              {error && <div role="alert" className="mb-4 p-3 rounded-[var(--radius-button)] bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleCode} className="space-y-5">
                <FormField label={useRecovery ? t("secondStep.recoveryLabel") : t("secondStep.codeLabel")} htmlFor="second-step-code">
                  <input
                    id="second-step-code"
                    required
                    autoFocus
                    type="text"
                    inputMode={useRecovery ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={useRecovery ? 16 : 7}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={fieldClasses()}
                    placeholder={useRecovery ? "xxxxx-xxxxx" : "123456"}
                  />
                </FormField>
                <Button type="submit" disabled={loading} variant="primary" size="blockMd">
                  {loading ? t("secondStep.checking") : t("secondStep.verify")}
                </Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <button type="button" onClick={() => { setUseRecovery(!useRecovery); setCode(""); setError(""); }} className="py-1 font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
                  {useRecovery ? t("secondStep.useApp") : t("secondStep.useRecovery")}
                </button>
                <button type="button" onClick={() => { setChallenge(null); setCode(""); setPassword(""); setError(""); setUseRecovery(false); }} className="py-1 font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
                  {t("secondStep.back")}
                </button>
              </div>
            </>
          ) : (
            <>
          <h2 className="text-3xl font-extrabold text-heading mb-2">{t("welcomeBack")}</h2>
          <p className="text-gray-500 mb-8">{t("signInSubtitle")}</p>

          {error && <div className="mb-4 p-3 rounded-[var(--radius-button)] bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label={t("identifier")} htmlFor="email">
              <input id="email" required type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClasses()} placeholder={t("identifierPlaceholder")} />
            </FormField>
            <FormField label={t("password")} htmlFor="password">
              <input id="password" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClasses()} placeholder={t("passwordPlaceholder")} />
              {mailOn ? (
                <Link href="/forgot-password" className="mt-1.5 inline-block text-xs py-1 font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
                  {t("forgotPassword")}
                </Link>
              ) : (
                <button type="button" onClick={() => setShowForgot(true)} className="py-1 mt-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
                  {t("forgotPassword")}
                </button>
              )}
            </FormField>
            <Button type="submit" disabled={loading} variant="primary" size="blockMd">
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>

            </>
          )}

          {!challenge && showForgot && (
            <div className="mt-4 rounded-[var(--radius-card)] bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900">
              <p className="font-semibold mb-1">{t("forgotPasswordTitle")}</p>
              <p>{t("forgotPasswordBody")}</p>
              {contact && (contact.contactEmail || contact.phone) && (
                <p className="mt-2 font-semibold">
                  {contact.contactEmail && <a href={`mailto:${contact.contactEmail}`} className="underline">{contact.contactEmail}</a>}
                  {contact.contactEmail && contact.phone && " · "}
                  {contact.phone}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">{t("noAccount")}{" "}
              <Link href="/register" className="py-1 font-semibold text-emerald-600 hover:text-emerald-700">{t("createOne")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
