import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-server";
import { getUserById, setUserPasswordHash } from "@/lib/server/users-repo";

// Excludes visually ambiguous characters (0/O, 1/l/I) since this password
// is meant to be read aloud or typed off a screen by the admin relaying it
// to the account owner, not copy-pasted.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

// Resets any account's password to a fresh random one and hands it back to
// the admin once, in the response -- never stored in plaintext anywhere.
// There's no email/SMS service wired up in this app, so this is the actual
// self-service escape hatch for now: the admin generates a new password
// here and relays it to the account owner directly (the buyer accounts
// imported from the Canton Fair spreadsheet already assume this kind of
// direct-contact channel exists, per the "contact person" field).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await setUserPasswordHash(targetId, passwordHash);

  return NextResponse.json({ password });
}
