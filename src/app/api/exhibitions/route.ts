import { NextResponse } from "next/server";
import { listExhibitions } from "@/lib/server/exhibitions-repo";

export async function GET() {
  const exhibitions = await listExhibitions();
  return NextResponse.json({ exhibitions });
}
