import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import {
  createExpoRegistration,
  findExistingRegistration,
} from "@/lib/server/expo-registrations-repo";
import { validateExpoRegistration, type ExpoRegistrationInput } from "@/lib/expo-registrations";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to register" }, { status: 401 });

  const body = await request.json();
  const { exhibitionSlug, ...input } = body as { exhibitionSlug: string } & Partial<ExpoRegistrationInput>;

  if (!exhibitionSlug) {
    return NextResponse.json({ error: "Missing exhibition" }, { status: 400 });
  }

  const exhibition = await getExhibitionBySlugOrId(exhibitionSlug);
  if (!exhibition) {
    return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });
  }

  const validationError = validateExpoRegistration(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await findExistingRegistration(Number(exhibition.id), user.id);
  if (existing) {
    return NextResponse.json({ error: "You've already registered for this expo" }, { status: 409 });
  }

  const id = await createExpoRegistration(user.id, {
    ...(input as ExpoRegistrationInput),
    exhibitionId: Number(exhibition.id),
  });

  return NextResponse.json({ id });
}
