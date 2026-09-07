"use client";
import { createContext, useContext } from "react";
import type { CompanyProfile } from "@/lib/company-profile";

const CompanyProfileContext = createContext<CompanyProfile | null>(null);

export function CompanyProfileProvider({ profile, children }: { profile: CompanyProfile; children: React.ReactNode }) {
  return <CompanyProfileContext.Provider value={profile}>{children}</CompanyProfileContext.Provider>;
}

// Lets components anywhere in the tree (e.g. Logo, rendered from NavBar,
// Footer, and standalone on the login/register pages) read the admin-set
// logo without every caller having to thread the companyProfile prop down
// through its own parent chain.
export function useCompanyProfile(): CompanyProfile | null {
  return useContext(CompanyProfileContext);
}
