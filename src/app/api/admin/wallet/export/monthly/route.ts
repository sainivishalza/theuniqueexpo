import { NextResponse } from "next/server";
import { buildMonthlyStatementExcel, monthBounds } from "@/lib/server/wallet-export";
import { limitOrNull, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// One month of the rewards wallet for the accountant, as an Excel file (?month=YYYY-MM).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "export", 30, 60_000);
  if (limited) return limited;
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!monthBounds(month)) return walletFail("invalid_input");
  try {
    const result = await buildMonthlyStatementExcel(month);
    if (!result) return walletFail("invalid_input");
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="wallet-statement-${month}.xlsx"`,
        "X-Truncated": result.truncated ? "1" : "0",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
