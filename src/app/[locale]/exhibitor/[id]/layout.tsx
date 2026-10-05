import type { Metadata } from "next";
import { mockExhibitorProfiles } from "@/lib/booths";
import { defaultOgImage, metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const profile = mockExhibitorProfiles.find((p) => p.id === id || p.slug === id);
  if (!profile) {
    return { title: "Exhibitor not found" };
  }

  const description = metaDescription(
    profile.description,
    `${profile.name} — ${profile.industry} exhibitor from ${profile.country}.`
  );
  const images = [{ url: defaultOgImage(locale) }];

  return {
    title: profile.name,
    description,
    openGraph: { title: profile.name, description, images },
    twitter: { title: profile.name, description, images },
  };
}

export default function ExhibitorProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
