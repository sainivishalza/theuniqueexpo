import { NextResponse } from "next/server";
import { buildTicketRefundsExcel } from "@/lib/server/wallet-export";
import { limitOrNull, requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// The train-ticket refund requests as an Excel file (?status=pending|approved|rejected, or none for all).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "export", 30, 60_000);
  if (limited) return limited;
  try {
    const status = new URL(request.url).searchParams.get("status") ?? "";
    const buffer = await buildTicketRefundsExcel(status);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ticket-refunds-${/^[a-z]+$/.test(status) ? status : "all"}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
