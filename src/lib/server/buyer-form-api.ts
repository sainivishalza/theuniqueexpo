import { NextResponse } from "next/server";
import { FormError } from "@/lib/server/buyer-form-repo";

// Turns what the buyer-form code throws into a response: its own errors carry a short code the
// screens translate; anything else is logged and shown as a plain failure.
export function formErrorResponse(err: unknown): NextResponse {
  if (err instanceof FormError) return NextResponse.json({ error: err.code, code: err.code }, { status: err.status });
  console.error("Buyer form error:", err);
  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "server_error" }, { status: 500 });
}
