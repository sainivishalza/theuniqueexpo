import type { Metadata } from "next";
import { mockExhibitorProfiles } from "@/lib/booths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = mockExhibitorProfiles.find((p) => p.id === id || p.slug === id);
  if (!profile) {
    return { title: "Exhibitor not found" };
  }

  const description = profile.description?.slice(0, 200) || `${profile.name} — ${profile.industry} exhibitor from ${profile.country}.`;

  return {
    title: profile.name,
    description,
    openGraph: { title: profile.name, description },
    twitter: { title: profile.name, description },
  };
}

export default function ExhibitorProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
