/**
 * GET /api/dashboard — aggregate issue counts for the dashboard.
 *
 * Authenticated endpoint returning total issue count, counts grouped by
 * status and priority, and the count of issues assigned to the session user.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { Priority, Status } from "@prisma/client";

export async function GET() {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const [total, assignedToMe, statusGroups, priorityGroups] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({
        where: { assignedToId: session.userId },
      }),
      prisma.issue.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      prisma.issue.groupBy({
        by: ["priority"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const byStatus: Record<Status, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    for (const group of statusGroups) {
      if (group.status in byStatus) {
        byStatus[group.status] = group._count._all;
      }
    }

    const byPriority: Record<Priority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const group of priorityGroups) {
      if (group.priority in byPriority) {
        byPriority[group.priority] = group._count._all;
      }
    }

    return NextResponse.json({
      total,
      byStatus,
      byPriority,
      assignedToMe,
    });
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
