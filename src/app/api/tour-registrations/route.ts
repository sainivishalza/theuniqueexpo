import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUser, createUserAccount, verifyUserPassword, setSessionCookie, type SessionUser } from "@/lib/auth-server";
import { getTourBySlugOrId } from "@/lib/server/tours-repo";
import { createTourRegistration, findExistingTourRegistration } from "@/lib/server/tour-registrations-repo";
import { validateCustomAnswers } from "@/lib/custom-registration-form";

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err: any) {
    console.error("Tour registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

async function handlePost(request: Request): Promise<NextResponse> {
  let user: SessionUser | null = await getSessionUser(request);
  let newSessionToken: string | null = null;

  const body = await request.json();
  const { tourSlug, customAnswers, password, email, fullName } = body as {
    tourSlug: string;
    customAnswers?: Record<string, unknown>;
    password?: string;
    email?: string;
    fullName?: string;
  };

  if (!tourSlug) {
    return NextResponse.json({ error: "Missing tour" }, { status: 400 });
  }

  // Same inline account creation/login as exhibition registration -- this
  // form is often a visitor's first sign-up, so it doubles as one instead
  // of requiring a separate step first.
  if (!user) {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password) {
      return NextResponse.json({ error: "Please provide your email and a password" }, { status: 400 });
    }

    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [trimmedEmail]);
    if ((rows as any[]).length > 0) {
      const verified = await verifyUserPassword(trimmedEmail, password);
      if (!verified) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in first.", accountExists: true },
          { status: 401 }
        );
      }
      user = verified;
    } else {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const created = await createUserAccount(fullName?.trim() || trimmedEmail, trimmedEmail, password, "visitor", "");
      user = created.user;
      newSessionToken = created.token;
    }
  }

  const tour = await getTourBySlugOrId(tourSlug);
  if (!tour) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  if (!tour.registrationEnabled) {
    return NextResponse.json({ error: "Registration is closed for this tour" }, { status: 403 });
  }

  const existing = await findExistingTourRegistration(Number(tour.id), user.id);
  if (existing) {
    return NextResponse.json({ error: "You've already registered for this tour" }, { status: 409 });
  }

  const schema = tour.registrationFormSchema || [];
  const validationError = validateCustomAnswers(schema, customAnswers || {});
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const id = await createTourRegistration(user.id, Number(tour.id), customAnswers || {}, schema);
  const response = NextResponse.json({ id, user }, { status: 201 });
  if (newSessionToken) setSessionCookie(response, newSessionToken);
  return response;
}
