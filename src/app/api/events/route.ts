import { NextResponse } from "next/server";
import { listEvents } from "@/lib/server/events-repo";

export async function GET(request: Request) {
  const view = new URL(request.url).searchParams.get("view");
  const events = await listEvents(view === "past" ? "past" : view === "upcoming" ? "upcoming" : undefined);
  return NextResponse.json(
    { events },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
