import { notFound } from "next/navigation";
import { mockExhibitorProfiles } from "@/lib/booths";

// The directory only ever listed sample companies. Until real exhibitor
// profiles exist it is a real 404 rather than an empty "0 exhibitors" page.
export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  if (mockExhibitorProfiles.length === 0) notFound();
  return children;
}
