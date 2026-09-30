/**
 * GET  /api/issues — list issues with optional filters.
 * POST /api/issues — create a new issue (any authenticated user).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createIssueSchema, issueFiltersSchema } from "@/lib/validations/issue";
import { Prisma } from "@prisma/client";

/** Select only the id + name subset of a user relation. */
const userSelect = { id: true, name: true } as const;

// ---------------------------------------------------------------------------
// GET /api/issues
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  void session; // authenticated; role-based filtering can be added later

  // Parse query-string filters
  const { searchParams } = new URL(request.url);
  const rawFilters = {
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    assignedToId: searchParams.get("assignedToId") ?? undefined,
  };

  const parsed = issueFiltersSchema.safeParse(rawFilters);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { status, priority, assignedToId } = parsed.data;

  try {
    const issues = await prisma.issue.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        assignedToId: true,
        createdBy: { select: userSelect },
        assignedTo: { select: userSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ issues });
  } catch (err) {
    console.error("[GET /api/issues]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/issues
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { title, description, priority, assignedToId } = parsed.data;

  try {
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        priority,
        createdById: session.userId,
        assignedToId: assignedToId ?? null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        assignedToId: true,
        createdBy: { select: userSelect },
        assignedTo: { select: userSelect },
      },
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return NextResponse.json(
        { error: { assignedToId: ["User does not exist"] } },
        { status: 422 }
      );
    }
    console.error("[POST /api/issues]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
