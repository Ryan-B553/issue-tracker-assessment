/**
 * POST /api/issues/[id]/comments — add a comment to an issue.
 * Any authenticated user may comment.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validations/issue";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { id: rawId } = await params;
  const issueId = Number(rawId);
  if (!Number.isInteger(issueId) || issueId <= 0) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    // Verify the issue exists before creating the comment
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        body: parsed.data.body,
        issueId,
        userId: session.userId,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/issues/[id]/comments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
