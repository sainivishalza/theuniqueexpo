import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "theuniqueexpo-secret-key-change-in-production";

export async function POST(request: Request) {
  try {
    const { name, email, password, role, country } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, country) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, role || "buyer", country || ""]
    );
    const userId = (result as any).insertId;

    // Generate JWT
    const token = jwt.sign({ id: userId, email, role: role || "buyer" }, JWT_SECRET, { expiresIn: "7d" });

    // Set cookie
    const response = NextResponse.json({
      user: { id: userId, name, email, role: role || "buyer", country: country || "" },
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
