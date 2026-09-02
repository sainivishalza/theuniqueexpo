import type { Metadata } from "next";
import { getRfqById } from "@/lib/server/rfqs-repo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rfq = await getRfqById(Number(id));
  if (!rfq) {
    return { title: "Buy request not found" };
  }

  const description =
    rfq.description?.slice(0, 200) || `Buy request for ${rfq.product} — quantity ${rfq.quantity}, category ${rfq.category}.`;

  return {
    title: rfq.title,
    description,
    openGraph: { title: rfq.title, description },
    twitter: { title: rfq.title, description },
  };
}

export default function RfqDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
