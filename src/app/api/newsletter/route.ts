import { NextResponse } from "next/server";
import { addNewsletterSubscriber } from "@/lib/server/newsletter-repo";
import { rateLimitOrNull } from "@/lib/server/rate-limit";

const NEWSLETTER_LIMIT = 10;
const NEWSLETTER_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES = ["en", "ru", "zh"];

// Public footer signup -- no login required.
export async function POST(request: Request) {
  const limited = rateLimitOrNull(request, "newsletter", NEWSLETTER_LIMIT, NEWSLETTER_WINDOW_MS);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const locale = LOCALES.includes(body.locale) ? body.locale : "en";
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    await addNewsletterSubscriber(email, locale);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Newsletter signup error:", err);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
