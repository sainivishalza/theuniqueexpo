"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { initBooths, bookBooth } from "@/lib/booths";
import { useAuth } from "@/lib/auth-context";
import { formatNumber, formatCurrency } from "@/lib/format";

interface Exhibition { id: string; slug: string; title: string; }

export default function BookBoothPage() {
  const t = useTranslations("bookBoothPage");
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const boothId = typeof params.boothId === "string" ? params.boothId : "";
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);
  const [step, setStep] = useState<"details" | "payment" | "confirm">("details");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExpo(data.exhibition))
      .catch(() => setExpo(null));
  }, [slug]);

  const booths = useMemo(() => {
    if (!expo) return [];
    return initBooths(expo.id);
  }, [expo]);

  const booth = booths.find((b) => b.id === boothId);

  if (expo === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

  if (!expo || !booth || !user) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{t("notFoundOrLogin")}</p>
          <Link href={`/exhibitions/${slug}`} className="mt-2 text-sm text-gray-500 hover:underline">
            {t("backToExhibition")}
          </Link>
        </div>
      </main>
    );
  }

  const handlePayment = () => {
    setProcessing(true);
    // Simulate Stripe checkout
    setTimeout(() => {
      bookBooth(boothId, String(user.id), user.name || user.email);
      setProcessing(false);
      setStep("confirm");
    }, 2000);
  };

  if (step === "confirm") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">{t("boothBooked")}</h1>
          <p className="text-gray-500">
            {t("boothIsYours", { boothId: `${booth.row}${booth.col}`, size: booth.size, name: expo.title })}
          </p>
          <p className="text-sm text-gray-400">
            {t("bookingIdCharged", { id: `bk-${Date.now()}`, price: formatCurrency(booth.price) })}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard/exhibitor"
              className="rounded bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {t("viewInDashboard")}
            </Link>
            <Link
              href={`/exhibitor/${String(user.id)}`}
              className="rounded border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("viewMyProfile")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/exhibitions/${slug}/floor-plan`}
        className="text-sm text-gray-500 hover:underline"
      >
        {t("backToFloorPlan")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{t("bookBoothTitle", { boothId: `${booth.row}${booth.col}` })}</h1>

      {/* Progress steps */}
      <div className="mt-6 flex items-center gap-3 text-sm">
        <StepBadge num={1} label={t("steps.details")} active={step === "details"} done={step === "payment"} />
        <span className="text-gray-300">→</span>
        <StepBadge num={2} label={t("steps.payment")} active={step === "payment"} />
        <span className="text-gray-300">→</span>
        <StepBadge num={3} label={t("steps.confirm")} active={false} />
      </div>

      {step === "details" && (
        <div className="mt-8 space-y-6">
          <div className="rounded border border-gray-200 p-5">
            <h2 className="font-semibold">{t("bookingSummary")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Row label={t("exhibition")} value={expo.title} />
              <Row label={t("booth")} value={`${booth.row}${booth.col}`} />
              <Row label={t("size")} value={booth.size} />
              <Row label={t("price")} value={formatCurrency(booth.price)} />
              <Row label={t("exhibitor")} value={user.name || user.email} />
            </div>
          </div>

          <button
            onClick={() => setStep("payment")}
            className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t("continueToPayment")}
          </button>
        </div>
      )}

      {step === "payment" && (
        <div className="mt-8 space-y-6">
          <div className="rounded border border-gray-200 p-5">
            <h2 className="font-semibold">{t("paymentDetails")}</h2>
            <p className="mt-1 text-xs text-gray-400">
              {t("stripeTestMode")}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">{t("cardNumber")}</label>
                <input
                  type="text"
                  defaultValue="4242 4242 4242 4242"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">{t("expiry")}</label>
                  <input
                    type="text"
                    defaultValue="12/28"
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">{t("cvc")}</label>
                  <input
                    type="text"
                    defaultValue="123"
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("details")}
              className="rounded border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("back")}
            </button>
            <button
              onClick={handlePayment}
              disabled={processing}
              className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {processing
                ? t("processingPayment")
                : t("payAmount", { amount: formatCurrency(booth.price) })}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StepBadge({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-green-500 text-white"
            : active
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? "✓" : num}
      </span>
      <span className={active ? "font-medium" : "text-gray-400"}>{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  );
}
