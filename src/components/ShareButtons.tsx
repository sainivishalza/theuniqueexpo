"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const BUTTON_CLASS =
  "w-10 h-10 rounded-[var(--radius-icon-sm)] bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2";

// Real share links for the current page. The URL is read in the browser after
// mount (the pages are pre-built), so until then the buttons point at the
// canonical site URL.
export default function ShareButtons({ title }: { title: string }) {
  const t = useTranslations("exhibitionDetail");
  const [url, setUrl] = useState("https://theuniqueexpo.com");
  useEffect(() => {
    setUrl(window.location.origin + window.location.pathname);
  }, []);
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const links = [
    { icon: "𝕏", label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${text}` },
    { icon: "in", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { icon: "f", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { icon: "✉", label: t("shareByEmail"), href: `mailto:?subject=${text}&body=${u}` },
  ];
  return (
    <div className="flex gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target={l.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={l.label}
          className={BUTTON_CLASS}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
