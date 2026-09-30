/**
 * validations/issue.ts — Zod schemas for issue and comment endpoints.
 *
 * Enum values match the Prisma schema exactly (uppercase for Priority/Status,
 * lowercase for Role). Int ids are coerced from strings when coming in as
 * query-string parameters.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enum schemas (match prisma schema casing exactly)
// ---------------------------------------------------------------------------

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const statusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

// ---------------------------------------------------------------------------
// Issue schemas
// ---------------------------------------------------------------------------

export const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().trim().max(5000).optional(),
  priority: prioritySchema.optional(),
  assignedToId: z.number().int().positive().optional().nullable(),
});

export const updateIssueSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    assignedToId: z.number().int().positive().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/** Query-string filters for GET /api/issues */
export const issueFiltersSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedToId: z
    .string()
    .regex(/^\d+$/, "assignedToId must be a positive integer")
    .transform(Number)
    .optional(),
});

// ---------------------------------------------------------------------------
// Comment schema
// ---------------------------------------------------------------------------

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment body is required").max(2000),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueFilters = z.infer<typeof issueFiltersSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
