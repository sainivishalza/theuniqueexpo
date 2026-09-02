"use client";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { businessToursData, localizeTour } from "@/lib/tours";
import { formatNumber } from "@/lib/format";

export default function BusinessToursPage() {
  const t = useTranslations("businessToursPage");
  const locale = useLocale();
  const businessTours = businessToursData.map((tour) => localizeTour(tour, locale));
  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {businessTours.map((tour) => (
              <Link key={tour.id} href={"/services/business-tours/" + tour.slug} className="group block rounded-2xl overflow-hidden bg-white shadow-md card-hover">
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={tour.image}
                    alt={tour.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900">{tour.city}</span>
                    <span className="rounded-lg bg-emerald-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">{tour.duration}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 drop-shadow-lg">{tour.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-500 mb-2">{tour.dates}</p>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">{tour.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xl font-extrabold text-gray-900">${formatNumber(tour.price)} <span className="text-sm font-normal text-gray-400">USD</span></div>
                    <span className="text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">{t("viewDetails")}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
