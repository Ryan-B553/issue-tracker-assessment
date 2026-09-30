/**
 * GET /api/auth/me — returns the currently logged-in user.
 * Used by the UI for the navbar, permissions, and "assigned to me".
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ user });
    } catch (err) {
        console.error("[GET /api/auth/me]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}