import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/server/company-profile-repo";
import { normalizeCompanyProfile, GA_MEASUREMENT_ID_RE, extractSiteVerification, SITE_VERIFICATION_RE } from "@/lib/company-profile";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const profile = await getCompanyProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.legalName) {
    return NextResponse.json({ error: "Legal name is required" }, { status: 400 });
  }
  if (!isValidImageField(body.logoUrl) || !isValidImageField(body.faviconUrl)) {
    return NextResponse.json({ error: "Logo/favicon must be a valid image file or URL" }, { status: 400 });
  }

  const gaId = typeof body.googleAnalyticsId === "string" ? body.googleAnalyticsId.trim() : "";
  if (gaId && !GA_MEASUREMENT_ID_RE.test(gaId)) {
    return NextResponse.json({ error: "Google Analytics ID must look like G-XXXXXXXXXX" }, { status: 400 });
  }

  const verification = typeof body.googleSiteVerification === "string" ? extractSiteVerification(body.googleSiteVerification) : "";
  if (verification && !SITE_VERIFICATION_RE.test(verification)) {
    return NextResponse.json({ error: "Search Console verification code looks wrong -- paste the code from the HTML tag option" }, { status: 400 });
  }

  await updateCompanyProfile(normalizeCompanyProfile(body));
  return NextResponse.json({ ok: true });
}
