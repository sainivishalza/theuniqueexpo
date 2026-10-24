import { getMyInvoice } from "@/lib/server/ticket-refunds";
import { positiveId, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The e-invoice our team attached to one of the buyer's own requests, as a file to save.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const file = await getMyInvoice(auth.user.id, id);
    if (!file) return walletFail("not_found");
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="e-invoice-${id}.${file.extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
