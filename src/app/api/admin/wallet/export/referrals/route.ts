import { NextResponse } from "next/server";
import { buildReferralsExcel } from "@/lib/server/wallet-export";
import { limitOrNull, requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// Every referral as an Excel file: who invited whom, the points each side was paid and for which exhibition.
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "export", 30, 60_000);
  if (limited) return limited;
  try {
    const buffer = await buildReferralsExcel();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="referrals-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
