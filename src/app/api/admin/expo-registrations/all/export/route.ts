import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { buildAllRegistrationsExcel, readFilter } from "@/lib/server/all-registrations";

// The registrations the filters show (all pages of them) as an Excel file.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const { buffer, truncated } = await buildAllRegistrationsExcel(readFilter(new URL(request.url).searchParams));
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registrations-${date}.xlsx"`,
      "Content-Length": String(buffer.length),
      "X-Export-Truncated": truncated ? "1" : "0",
      "Cache-Control": "no-store",
    },
  });
}
