"use client";
import Image from "next/image";
import { useCompanyProfile } from "@/lib/company-profile-context";

const SIZES = {
  small: { box: "w-7 h-7", brand: "text-lg", imgH: 28 },
  default: { box: "w-8 h-8", brand: "text-xl", imgH: 32 },
  large: { box: "w-12 h-12", brand: "text-3xl", imgH: 44 },
};

export default function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const profile = useCompanyProfile();
  const s = SIZES[size];

  // A real uploaded logo (set in Admin -> Company Profile) replaces the
  // whole icon+wordmark lockup below, rather than sitting alongside it --
  // an uploaded brand mark is expected to already carry the full brand,
  // not just an icon.
  if (profile?.logoUrl) {
    return (
      <span className="inline-flex items-center" style={{ height: s.imgH }}>
        <Image
          src={profile.logoUrl}
          alt={profile.legalName || "The Unique Expo"}
          width={s.imgH * 4}
          height={s.imgH}
          className="h-full w-auto object-contain"
          unoptimized
        />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5 group">
      <div className={`${s.box} rounded-lg gradient-brand flex items-center justify-center text-white font-bold shadow-sm`}>
        <svg viewBox="0 0 24 24" fill="none" className={`${size === "small" ? "w-4 h-4" : size === "large" ? "w-7 h-7" : "w-5 h-5"}`}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className={`${s.brand} font-extrabold tracking-tight text-heading leading-none`}>
        <span className="text-emerald-600">The Unique</span> Expo
      </div>
    </div>
  );
}
