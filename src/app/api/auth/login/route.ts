/**
 * POST /api/auth/login
 *
 * Validates credentials, compares the bcrypt hash, and issues a JWT
 * session cookie on success.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- Validate input -------------------------------------------------------
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;

    // --- Look up user ---------------------------------------------------------
    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison even on "not found" to prevent timing attacks
    const hash = user?.passwordHash ?? "$2b$12$invalidhashtopreventtiming";
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // --- Issue session ---------------------------------------------------------
    await setSessionCookie({ userId: user.id, role: user.role });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
