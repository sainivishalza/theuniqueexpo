import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getActiveFormItems } from "@/lib/server/buyer-form-repo";

// The documents and extra information fields buyers are asked for right now (the ones an admin
// has not hidden), in their order. Any signed-in person may read the list; it holds no buyer data.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const items = await getActiveFormItems();
  return NextResponse.json(
    { documents: items.filter((i) => i.kind === "document"), fields: items.filter((i) => i.kind === "field") },
    { headers: { "Cache-Control": "no-store" } }
  );
}
