/**
 * GET   /api/issues/[id] — fetch a single issue with its comments.
 * PATCH /api/issues/[id] — update an issue (admin, creator, or assignee).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateIssueSchema } from "@/lib/validations/issue";
import { Prisma } from "@prisma/client";
/** Select only the id + name subset of a user relation. */
const userSelect = { id: true, name: true } as const;

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/issues/[id]
// ---------------------------------------------------------------------------

export async function GET(_request: Request, { params }: Params) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  void session;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  try {
    const issue = await prisma.issue.findUnique({
      where: { id },
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
        comments: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            user: { select: userSelect },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (err) {
    console.error("[GET /api/issues/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/issues/[id]
// ---------------------------------------------------------------------------

export async function PATCH(request: Request, { params }: Params) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    // Fetch the issue to enforce ownership / role check
    const existing = await prisma.issue.findUnique({
      where: { id },
      select: { id: true, createdById: true, assignedToId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const isAdmin = session.role === "admin";
    const isCreator = existing.createdById === session.userId;
    const isAssignee = existing.assignedToId === session.userId;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json(
        { error: "Forbidden: you are not allowed to edit this issue" },
        { status: 403 }
      );
    }

    const { title, description, priority, status, assignedToId } = parsed.data;

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
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
    });

    return NextResponse.json({ issue: updated });
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
    console.error("[PATCH /api/issues/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
