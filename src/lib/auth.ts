/**
 * auth.ts — JWT helpers: sign a token, verify it, and manage session cookies.
 *
 * Built on `jose` (HS256 JWTs). Payload types and roles strictly match
 * the Prisma schema definitions.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "admin" | "user";

export interface SessionPayload {
  userId: number;
  email?: string;
  role: Role;
}

export type AuthResult =
  | { session: SessionPayload; errorResponse: null }
  | { session: null; errorResponse: NextResponse };

// ---------------------------------------------------------------------------
// Config & Secret Evaluation
// ---------------------------------------------------------------------------

const COOKIE_NAME = "session";

/**
 * Reads JWT_SECRET lazily so `next build` (e.g. inside Docker) doesn't fail
 * when runtime secrets are absent, and enforces a minimum key length of 32 characters.
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set (at least 32 characters)");
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Signs a new JWT and returns the token string. */
export async function signToken(payload: SessionPayload): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verifies a JWT and strictly validates the payload shape and types. */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  // Read outside try: missing/short secret errors must fail loudly, not be swallowed
  const secret = getSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "number" ||
      (payload.role !== "admin" && payload.role !== "user")
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Session Cookie
// ---------------------------------------------------------------------------

/** Writes the session cookie on the current response. */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
}

/** Clears the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Current-user Helper
// ---------------------------------------------------------------------------

/**
 * Returns the current user's session payload, or null if not authenticated.
 * Use at the top of Server Components or API routes.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ---------------------------------------------------------------------------
// Route-Level Authorization Guards
// ---------------------------------------------------------------------------

/**
 * Asserts that the caller is authenticated.
 * Returns { session, errorResponse: null } or { session: null, errorResponse: NextResponse }.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getCurrentUser();
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, errorResponse: null };
}

/**
 * Asserts that the caller has one of the allowed roles.
 * Returns { session, errorResponse: null } or { session: null, errorResponse: NextResponse }.
 */
export async function requireRole(allowed: Role[]): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth;

  if (!allowed.includes(auth.session.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return auth;
}