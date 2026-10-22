import { NextResponse } from "next/server";
import { FormError } from "@/lib/server/buyer-form-repo";
import { DocumentFileError } from "@/lib/server/document-image";

// Turns what the buyer-form code throws into a response: its own errors carry a short code the
// screens translate; anything else is logged and shown as a plain failure.
export function formErrorResponse(err: unknown): NextResponse {
  if (err instanceof FormError) return NextResponse.json({ error: err.code, code: err.code }, { status: err.status });
  if (err instanceof DocumentFileError) {
    return NextResponse.json({ error: "This file could not be read as a picture or PDF. Please choose another file.", code: err.code }, { status: 400 });
  }
  console.error("Buyer form error:", err);
  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "server_error" }, { status: 500 });
}
