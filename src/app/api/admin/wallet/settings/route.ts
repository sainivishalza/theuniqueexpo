import { NextResponse } from "next/server";
import { parsePoints } from "@/lib/wallet";
import { getWalletSettings, getWalletTextSettings, saveWalletSettings } from "@/lib/server/wallet-repo";
import { isValidUploadedImage } from "@/lib/server/validate-upload";
import { MAX_WALLET_IMAGE_BYTES, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ ...(await getWalletSettings()), ...(await getWalletTextSettings()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");

  const transferMax = parsePoints(body.transferMax);
  const transferDailyMax = parsePoints(body.transferDailyMax);
  const withdrawMin = parsePoints(body.withdrawMin);
  if (transferMax === null || transferDailyMax === null || withdrawMin === null) return walletFail("invalid_amount");
  if (transferMax > transferDailyMax) return walletFail("invalid_input");
  if (typeof body.transfersEnabled !== "boolean" || typeof body.withdrawalsEnabled !== "boolean") return walletFail("invalid_input");

  const alipay = typeof body.companyAlipayQr === "string" ? body.companyAlipayQr : "";
  const wechat = typeof body.companyWechatQr === "string" ? body.companyWechatQr : "";
  for (const qr of [alipay, wechat]) {
    if (qr !== "" && !isValidUploadedImage(qr, MAX_WALLET_IMAGE_BYTES)) return walletFail("invalid_input");
  }
  try {
    await saveWalletSettings({
      transferMax,
      transferDailyMax,
      withdrawMin,
      transfersEnabled: body.transfersEnabled,
      withdrawalsEnabled: body.withdrawalsEnabled,
      topupInstructions: text(body.topupInstructions, 3000),
      companyAlipayQr: alipay,
      companyWechatQr: wechat,
      companyBankDetails: text(body.companyBankDetails, 1500),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
