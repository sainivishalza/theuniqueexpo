import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import {
  cancelMyRegistration,
  confirmMyAttendance,
  getMyRegistration,
  rewriteRegistration,
  submitMyFeedback,
} from "@/lib/server/expo-registrations-repo";
import { parseFormSubmission } from "@/lib/server/expo-registration-form";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import type { ExpoRegistrationInput } from "@/lib/expo-registrations";
import { validateConfirmInput, validateFeedback, type ConfirmAttendanceInput } from "@/lib/registration-lifecycle";

// A buyer's own registration: cancel, confirm attendance, leave feedback (PATCH),
// or edit the sign-up form while it is still waiting for review (PUT).

async function loadOwned(request: Request, idParam: string) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Please sign in" }, { status: 401 }) } as const;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT exhibition_id FROM expo_registrations WHERE id = ? AND user_id = ? LIMIT 1",
    [id, user.id]
  );
  // Someone else's registration looks exactly like one that does not exist.
  if (!rows[0]) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  return { user, id, exhibitionId: rows[0].exhibition_id as number } as const;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owned = await loadOwned(request, (await params).id);
    if ("error" in owned) return owned.error;
    const { user, id, exhibitionId } = owned;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;

    if (action === "cancel") {
      if (!(await cancelMyRegistration(id, user.id))) {
        return NextResponse.json({ error: "This registration can no longer be cancelled" }, { status: 409 });
      }
    } else if (action === "confirm") {
      const input: ConfirmAttendanceInput = {
        arrivalDate: typeof body.arrivalDate === "string" ? body.arrivalDate : undefined,
        arrivalNote: typeof body.arrivalNote === "string" ? body.arrivalNote : undefined,
        docTicket: typeof body.docTicket === "string" ? body.docTicket : undefined,
      };
      const invalid = validateConfirmInput(input, isValidUploadedDocument);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      if (!(await confirmMyAttendance(id, user.id, input))) {
        return NextResponse.json(
          { error: "You can no longer confirm this registration. The confirm-by date may have passed." },
          { status: 409 }
        );
      }
    } else if (action === "feedback") {
      const invalid = validateFeedback(body.rating, body.comment);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const comment = typeof body.comment === "string" ? body.comment : "";
      if (!(await submitMyFeedback(id, user.id, body.rating as number, comment))) {
        return NextResponse.json({ error: "Feedback can't be sent for this registration" }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ registration: await getMyRegistration(exhibitionId, user.id) });
  } catch (err) {
    console.error("Expo registration update error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owned = await loadOwned(request, (await params).id);
    if ("error" in owned) return owned.error;
    const { user, id, exhibitionId } = owned;

    const exhibition = await getExhibitionBySlugOrId(String(exhibitionId));
    if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { customAnswers?: Record<string, unknown> } & Partial<ExpoRegistrationInput>;
    // The exhibitionSlug / password fields the sign-up form also sends are not part of the form itself.
    const { customAnswers, ...fields } = body as Record<string, unknown> & { customAnswers?: Record<string, unknown> };
    delete fields.exhibitionSlug;
    delete fields.password;

    const parsed = parseFormSubmission(exhibition, customAnswers, fields as Partial<ExpoRegistrationInput>);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (!(await rewriteRegistration(id, user.id, "edit", parsed.form))) {
      return NextResponse.json({ error: "This registration can't be edited any more because it has already been reviewed" }, { status: 409 });
    }
    return NextResponse.json({ registration: await getMyRegistration(exhibitionId, user.id) });
  } catch (err) {
    console.error("Expo registration edit error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
