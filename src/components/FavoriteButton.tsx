"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

// Module-level cache so every FavoriteButton on a list page (many cards)
// shares one /api/favorites?idsOnly fetch instead of one each.
let idsPromise: Promise<Set<string>> | null = null;
function loadFavoriteIds(): Promise<Set<string>> {
  if (!idsPromise) {
    idsPromise = fetch("/api/favorites?idsOnly=true")
      .then((res) => (res.ok ? res.json() : { exhibitionIds: [] }))
      .then((data) => new Set<string>(data.exhibitionIds || []))
      .catch(() => new Set<string>());
  }
  return idsPromise;
}

export default function FavoriteButton({
  exhibitionId,
  className = "",
  showLabel = false,
  initialSaved,
  onChange,
}: {
  exhibitionId: string;
  className?: string;
  showLabel?: boolean;
  // Skips the idsOnly lookup when the caller already knows the state (e.g.
  // the favorites page itself, where every card shown is already saved).
  initialSaved?: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const t = useTranslations("favoriteButton");
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(!!initialSaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || initialSaved !== undefined) return;
    loadFavoriteIds().then((ids) => setSaved(ids.has(exhibitionId)));
  }, [user, exhibitionId, initialSaved]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exhibitionId }),
        });
      } else {
        await fetch(`/api/favorites/${exhibitionId}`, { method: "DELETE" });
      }
      idsPromise = null; // invalidate the shared cache so other buttons stay in sync on next mount
      onChange?.(next);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? t("removeFromSaved") : t("saveExhibition")}
      aria-pressed={saved}
      className={`flex items-center justify-center gap-1.5 transition-colors ${showLabel ? "rounded-xl px-4 py-2 text-sm font-semibold" : "rounded-full"} ${saved ? "bg-red-500 text-white" : "bg-white/90 text-gray-700 hover:bg-white"} ${className}`}
    >
      {saved ? "❤️" : "🤍"}
      {showLabel && <span>{saved ? t("saved") : t("save")}</span>}
    </button>
  );
}
