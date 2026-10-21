import { NextResponse } from "next/server";
import { buildMovementsExcel } from "@/lib/server/wallet-export";
import { limitOrNull, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Every movement of points as an Excel file (?from=YYYY-MM-DD&to=YYYY-MM-DD, both optional).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = limitOrNull(auth.admin.id, "export", 30, 60_000);
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const from = params.get("from") || null;
  const to = params.get("to") || null;
  if ((from && (!DAY.test(from) || Number.isNaN(Date.parse(from)))) || (to && (!DAY.test(to) || Number.isNaN(Date.parse(to))))) return walletFail("invalid_input");
  if (from && to && from > to) return walletFail("invalid_input");
  try {
    const { buffer, truncated } = await buildMovementsExcel(from, to);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="point-movements-${date}.xlsx"`,
        "X-Truncated": truncated ? "1" : "0",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
