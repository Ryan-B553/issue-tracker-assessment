/**
 * POST /api/auth/register
 *
 * Creates a new user account, hashes the password with bcrypt,
 * and immediately issues a session cookie so the user is logged in.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  // --- Parse JSON safely ---------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // --- Validate input -------------------------------------------------------
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    // --- Check uniqueness (fast check) ----------------------------------------
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 }
      );
    }

    // --- Persist & Issue Session ----------------------------------------------
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });

    await setSessionCookie({ userId: user.id, role: user.role });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    // Catch database-level unique constraint collision (race condition)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 }
      );
    }

    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}