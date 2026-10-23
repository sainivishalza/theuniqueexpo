import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { deleteTemplate, listTemplates, saveTemplate, type Langs } from "@/lib/server/announcement-templates";

const LOCALES = ["en", "ru", "zh"] as const;

function readLangs(value: unknown, max: number): Langs | "bad" {
  const out: Langs = { en: "", ru: "", zh: "" };
  for (const l of LOCALES) {
    const v = (value as Record<string, unknown> | null)?.[l];
    if (v !== undefined && typeof v !== "string") return "bad";
    out[l] = typeof v === "string" ? v.trim() : "";
    if (out[l].length > max) return "bad";
  }
  return out;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ templates: await listTemplates() });
}

// Save the current announcement text under a name (the same name replaces it).
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 100) return NextResponse.json({ error: "Give the template a name of up to 100 characters", code: "bad_name" }, { status: 400 });
  const subject = readLangs(body?.subject, 150);
  const message = readLangs(body?.message, 5000);
  if (subject === "bad" || message === "bad" || /[\r\n]/.test(subject.en + subject.ru + subject.zh)) return NextResponse.json({ error: "The subject or the message is too long", code: "too_long" }, { status: 400 });
  // English is what everyone falls back to, so a template needs it, like an announcement does.
  if (subject.en.length < 3 || message.en.length < 5) return NextResponse.json({ error: "English subject and message are required", code: "english_required" }, { status: 400 });
  const saved = await saveTemplate(name, subject, message, admin.id);
  if (saved === "limit") return NextResponse.json({ error: "Too many templates", code: "limit" }, { status: 409 });
  if (saved === "unavailable") return NextResponse.json({ error: "Templates are not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "announcement_template_saved", { targetType: "announcement_template", targetId: saved.id, details: name });
  return NextResponse.json({ ok: true, id: saved.id, replaced: saved.replaced, templates: await listTemplates() });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  const name = await deleteTemplate(id);
  if (name === null) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, "announcement_template_deleted", { targetType: "announcement_template", targetId: id, details: name });
  return NextResponse.json({ ok: true, templates: await listTemplates() });
}
