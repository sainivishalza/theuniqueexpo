import { NextResponse } from "next/server";
import { buildWithdrawalsExcel } from "@/lib/server/wallet-export";
import { limitOrNull, requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// The withdrawal requests as an Excel file for paying them out (?status=pending|paid|rejected|cancelled, or none for all).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "export", 30, 60_000);
  if (limited) return limited;
  try {
    const status = new URL(request.url).searchParams.get("status") ?? "";
    const buffer = await buildWithdrawalsExcel(status);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="withdrawals-${/^[a-z]+$/.test(status) ? status : "all"}-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
