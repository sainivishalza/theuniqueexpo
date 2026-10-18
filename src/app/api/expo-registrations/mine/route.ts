import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { getMyRegistration, getRegistrationById, listMyRegistrations } from "@/lib/server/expo-registrations-repo";

const LOCALES = ["en", "ru", "zh"];

// The signed-in buyer's own registrations: one exhibition (?exhibition=slug), or all of them.
// With ?full=1 the stored sign-up form comes back too, so the buyer can edit it.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedLocale = searchParams.get("locale") || "";
  const locale = LOCALES.includes(requestedLocale) ? requestedLocale : undefined;
  const slug = searchParams.get("exhibition");

  if (!slug) {
    return NextResponse.json({ registrations: await listMyRegistrations(user.id, locale) });
  }

  const exhibition = await getExhibitionBySlugOrId(slug);
  if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

  const registration = await getMyRegistration(Number(exhibition.id), user.id, locale);
  if (searchParams.get("full") === "1" && registration) {
    const form = await getRegistrationById(Number(registration.id));
    return NextResponse.json({ registration, form });
  }
  return NextResponse.json({ registration });
}
