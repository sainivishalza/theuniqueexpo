import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUser, createUserAccount, verifyUserPassword, setSessionCookie, type SessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import {
  createExpoRegistration,
  createCustomExpoRegistration,
  findExistingRegistration,
} from "@/lib/server/expo-registrations-repo";
import { validateExpoRegistration, type ExpoRegistrationInput } from "@/lib/expo-registrations";
import { validateCustomAnswers } from "@/lib/custom-registration-form";

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("Expo registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

async function handlePost(request: Request): Promise<NextResponse> {
  let user: SessionUser | null = await getSessionUser(request);
  let newSessionToken: string | null = null;

  const body = await request.json();
  const { exhibitionSlug, customAnswers, password, email, fullName, ...input } = body as {
    exhibitionSlug: string;
    customAnswers?: Record<string, unknown>;
    password?: string;
    email?: string;
    fullName?: string;
  } & Partial<ExpoRegistrationInput>;

  if (!exhibitionSlug) {
    return NextResponse.json({ error: "Missing exhibition" }, { status: 400 });
  }

  // No session yet -- registering is also this visitor's first sign-up, so
  // the form itself creates (or, if the email already has an account, logs
  // into) their account instead of sending them through a separate step.
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
      const created = await createUserAccount(
        fullName?.trim() || trimmedEmail,
        trimmedEmail,
        password,
        input.registrationType === "visitor" ? "visitor" : "buyer",
        ""
      );
      user = created.user;
      newSessionToken = created.token;
    }
  }

  const exhibition = await getExhibitionBySlugOrId(exhibitionSlug);
  if (!exhibition) {
    return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });
  }

  if (!exhibition.registrationEnabled) {
    return NextResponse.json({ error: "Registration is closed for this exhibition" }, { status: 403 });
  }

  const existing = await findExistingRegistration(Number(exhibition.id), user.id);
  if (existing) {
    return NextResponse.json({ error: "You've already registered for this expo" }, { status: 409 });
  }

  const schema = exhibition.registrationFormSchema;
  let response: NextResponse;

  if (schema && schema.length > 0) {
    const validationError = validateCustomAnswers(schema, customAnswers || {});
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const id = await createCustomExpoRegistration(user.id, Number(exhibition.id), customAnswers || {}, schema);
    response = NextResponse.json({ id, user });
  } else {
    const fullInput = { ...input, email: email || "", fullName: fullName || "" };
    const validationError = validateExpoRegistration(fullInput);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const id = await createExpoRegistration(user.id, {
      ...(fullInput as ExpoRegistrationInput),
      exhibitionId: Number(exhibition.id),
    });
    response = NextResponse.json({ id, user });
  }

  if (newSessionToken) setSessionCookie(response, newSessionToken);
  return response;
}
