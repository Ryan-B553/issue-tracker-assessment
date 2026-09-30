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

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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

    // Compare against a dummy hash when the user doesn't exist,
    // so response time is similar either way.
    const hash = user?.passwordHash ?? DUMMY_HASH;
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
