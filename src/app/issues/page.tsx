/**
 * /issues/page.tsx — Issue list page.
 *
 * Filter bar (status, priority, assignee) drives a React Query fetch.
 * Each row links to /issues/[id]. A "New Issue" button goes to /issues/new.
 * Shows distinct loading, empty, and error states.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useIssues, type IssueFilters, type Priority, type Status } from "@/hooks/useIssues";
import { useUsers } from "@/hooks/useUsers";

// ─── Filter bar ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: Status | "all" }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const PRIORITY_OPTIONS: { label: string; value: Priority | "all" }[] = [
  { label: "All Priorities", value: "all" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

function FilterSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {children}
    </select>
  );
}

// ─── Issues page ───────────────────────────────────────────────────────────────

function IssueListContent() {
  const [filters, setFilters] = useState<IssueFilters>({
    status: "all",
    priority: "all",
    assignedToId: "all",
  });

  const { data: issues, isLoading, isError, error } = useIssues(filters);
  const { data: users } = useUsers();

  function set<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
        <Link
          id="btn-new-issue"
          href="/issues/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Issue
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <FilterSelect
          id="filter-status"
          value={filters.status}
          onChange={(v) => set("status", v as Status | "all")}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-priority"
          value={filters.priority}
          onChange={(v) => set("priority", v as Priority | "all")}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-assignee"
          value={String(filters.assignedToId)}
          onChange={(v) =>
            set("assignedToId", v === "all" ? "all" : (Number(v) as number))
          }
        >
          <option value="all">All Assignees</option>
          {(users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </FilterSelect>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load issues."}
        </div>
      )}

      {!isLoading && !isError && issues?.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No issues match your filters.</p>
          <Link href="/issues/new" className="text-sm font-medium text-indigo-600 hover:underline">
            Create the first one
          </Link>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && issues && issues.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 sm:table-cell">Assignee</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">Creator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {issue.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={issue.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={issue.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {issue.assignedTo?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                    {issue.createdBy.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  return (
    <AuthGuard>
      <IssueListContent />
    </AuthGuard>
  );
}
