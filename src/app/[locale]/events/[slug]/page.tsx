"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";

interface Event {
  id: string; slug: string; title: string; category: string; city: string; venue: string;
  eventDate: string; startTime: string; endTime: string; price: string; capacity: number;
  description: string; image: string; registrationEnabled: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  networking: "🤝", hiking: "🥾", picnic: "🧺", cultural: "🏮", other: "📅",
};

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("eventDetailPage");
  const { slug } = use(params);
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setEvent(data.event))
      .catch(() => setEvent(null));
  }, [slug]);

  if (event === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

  if (!event) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
          <Link href="/events" className="mt-4 inline-block text-emerald-600 hover:underline">{t("browseAll")}</Link>
        </div>
      </div>
    );
  }

  async function handleRegister() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/event-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("registrationFailed"));
      setRegistered(true);
    } catch (err) {
      setError(errorMessage(err, t("registrationFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="bg-gray-900 py-8 md:py-10">
        <div className="mx-auto max-w-5xl px-6">
          <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white border border-white/10 capitalize">
            {CATEGORY_ICONS[event.category] || "📅"} {t(`categories.${event.category}`)}
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl">
            {event.title}
          </h1>
        </div>
      </section>

      {event.image && (
        <section className="relative bg-gray-950 py-8 md:py-10 overflow-hidden">
          <Image src={event.image} alt="" aria-hidden="true" fill sizes="100vw" className="object-cover blur-3xl scale-110 opacity-25" />
          <div className="relative mx-auto max-w-4xl px-6 flex justify-center">
            <Image
              src={event.image} alt={event.title} width={1200} height={700}
              sizes="(max-width: 768px) 100vw, 800px"
              className="max-w-full max-h-[60vh] w-auto h-auto rounded-xl shadow-2xl"
              priority
            />
          </div>
        </section>
      )}

      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("aboutThisEvent")}</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <div className="text-xs text-gray-400">{t("dateAndTime")}</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {event.eventDate}{event.startTime ? ` · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}` : ""}
                  </div>
                </div>
              </div>
              {event.venue && (
                <div className="flex items-start gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <div className="text-xs text-gray-400">{t("location")}</div>
                    <div className="text-sm font-semibold text-gray-900">{event.venue}{event.city ? `, ${event.city}` : ""}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <div className="text-xs text-gray-400">{t("price")}</div>
                  <div className="text-sm font-semibold text-gray-900">{event.price || t("free")}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              {registered ? (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-semibold text-gray-900">{t("registrationSubmitted")}</p>
                </div>
              ) : !event.registrationEnabled ? (
                <div className="text-center py-2 text-sm font-semibold text-gray-500">{t("registrationClosed")}</div>
              ) : user ? (
                <>
                  {error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
                  <button
                    onClick={handleRegister}
                    disabled={submitting}
                    className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                  >
                    {submitting ? t("submitting") : t("registerForThisEvent")}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg transition-all"
                >
                  {t("logInToRegister")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
