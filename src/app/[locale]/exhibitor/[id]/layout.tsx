import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
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

// The directory used to link profiles by id (/exhibitor/ex-1) while the
// sitemap listed the slug, so every profile had two URLs. Send the id form to
// the slug form.
export default async function ExhibitorProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const profile = mockExhibitorProfiles.find((p) => p.id === id);
  if (profile && profile.slug && profile.slug !== id) {
    permanentRedirect(`/${locale}/exhibitor/${profile.slug}`);
  }
  return children;
}
