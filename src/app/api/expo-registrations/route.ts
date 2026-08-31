import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import {
  createExpoRegistration,
  createCustomExpoRegistration,
  findExistingRegistration,
} from "@/lib/server/expo-registrations-repo";
import { validateExpoRegistration, type ExpoRegistrationInput } from "@/lib/expo-registrations";
import { validateCustomAnswers } from "@/lib/custom-registration-form";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to register" }, { status: 401 });

  const body = await request.json();
  const { exhibitionSlug, customAnswers, ...input } = body as {
    exhibitionSlug: string;
    customAnswers?: Record<string, unknown>;
  } & Partial<ExpoRegistrationInput>;

  if (!exhibitionSlug) {
    return NextResponse.json({ error: "Missing exhibition" }, { status: 400 });
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
  if (schema && schema.length > 0) {
    const validationError = validateCustomAnswers(schema, customAnswers || {});
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const id = await createCustomExpoRegistration(user.id, Number(exhibition.id), customAnswers || {}, schema);
    return NextResponse.json({ id });
  }

  const validationError = validateExpoRegistration(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const id = await createExpoRegistration(user.id, {
    ...(input as ExpoRegistrationInput),
    exhibitionId: Number(exhibition.id),
  });

  return NextResponse.json({ id });
}
