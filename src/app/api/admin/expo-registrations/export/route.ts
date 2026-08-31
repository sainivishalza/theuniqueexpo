import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { listRegistrationsForExhibition } from "@/lib/server/expo-registrations-repo";

const COLUMNS = [
  "id", "registrationType", "fullName", "gender", "email", "phone", "nationality",
  "companyName", "companyWebsite", "companyType", "companyScale", "purposeOfVisit",
  "exportingMarkets", "passportNumber", "status", "createdAt",
] as const;

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exhibitionSlug = searchParams.get("exhibition");
  if (!exhibitionSlug) {
    return NextResponse.json({ error: "Missing exhibition" }, { status: 400 });
  }

  const exhibition = await getExhibitionBySlugOrId(exhibitionSlug);
  if (!exhibition) {
    return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });
  }

  const registrations = await listRegistrationsForExhibition(Number(exhibition.id));

  const schema = exhibition.registrationFormSchema;
  let lines: string[];
  if (schema && schema.length > 0) {
    const headers = ["id", ...schema.map((f: any) => f.label), "status", "createdAt"];
    lines = [
      headers.map(csvCell).join(","),
      ...registrations.map((r: any) => {
        const answers = r.customAnswers || {};
        const cells = [
          r.id,
          ...schema.map((f: any) => (f.type === "file" ? (answers[f.id] ? "Uploaded" : "") : answers[f.id])),
          r.status,
          r.createdAt,
        ];
        return cells.map(csvCell).join(",");
      }),
    ];
  } else {
    lines = [
      COLUMNS.join(","),
      ...registrations.map((r) => COLUMNS.map((col) => csvCell((r as any)[col])).join(",")),
    ];
  }
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exhibition.slug}-registrations.csv"`,
    },
  });
}
