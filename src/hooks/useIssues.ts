/**
 * useIssues.ts — React Query hook for the paginated / filtered issue list.
 *
 * Builds the query-string from the supplied filters, omitting a key entirely
 * when its value is "all" so the API never receives an empty string.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface IssueUser {
  id: number;
  name: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  assignedToId: number | null;
  createdBy: IssueUser;
  assignedTo: IssueUser | null;
}

export interface IssueFilters {
  status: Status | "all";
  priority: Priority | "all";
  assignedToId: number | "all";
}

export function useIssues(filters: IssueFilters) {
  return useQuery<Issue[]>({
    queryKey: ["issues", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.assignedToId !== "all")
        params.set("assignedToId", String(filters.assignedToId));

      const qs = params.toString();
      const data = await apiFetch<{ issues: Issue[] }>(
        `/api/issues${qs ? `?${qs}` : ""}`
      );
      return data.issues;
    },
  });
}
