import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { loadPersonFields, valuesForAllLocales } from "@/lib/server/announcement-people";

// For the announcement preview: the values the first selected buyer would get for {name}, {number} and {exhibition},
// in each language.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const first = Array.isArray(body?.userIds) ? body.userIds.find((v: unknown): v is number => Number.isInteger(v) && (v as number) > 0) : undefined;
  if (!first) return NextResponse.json({ error: "Select at least one buyer", code: "no_buyers" }, { status: 400 });
  const person = (await loadPersonFields([first])).get(first);
  if (!person) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  return NextResponse.json({ values: valuesForAllLocales(person) });
}
