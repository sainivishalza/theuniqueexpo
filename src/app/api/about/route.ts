import { NextResponse } from "next/server";
import { getAboutContent } from "@/lib/server/about-content-repo";

export async function GET() {
  const content = await getAboutContent();
  return NextResponse.json({ content });
}
