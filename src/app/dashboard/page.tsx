/**
 * /dashboard/page.tsx — Dashboard page.
 *
 * Client component wrapped in AuthGuard. Uses React Query to fetch aggregated
 * issue statistics from /api/dashboard and visualises totals, assigned-to-me count,
 * and bar charts for status and priority distributions using Recharts.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssues } from "@/hooks/useIssues";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  total: number;
  byStatus: {
    OPEN: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  byPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  assignedToMe: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#3B82F6", // blue-500
  IN_PROGRESS: "#A855F7", // purple-500
  RESOLVED: "#22C55E", // green-500
  CLOSED: "#6B7280", // gray-500
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22C55E", // green-500
  MEDIUM: "#F59E0B", // amber-500
  HIGH: "#EF4444", // red-500
};

// ─── Dashboard Content ─────────────────────────────────────────────────────────

function DashboardContent() {
  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load dashboard data."}
        </div>
      </div>
    );
  }

  const statusChartData = [
    { name: "Open", count: data.byStatus.OPEN, key: "OPEN" },
    { name: "In Progress", count: data.byStatus.IN_PROGRESS, key: "IN_PROGRESS" },
    { name: "Resolved", count: data.byStatus.RESOLVED, key: "RESOLVED" },
    { name: "Closed", count: data.byStatus.CLOSED, key: "CLOSED" },
  ];

  const priorityChartData = [
    { name: "Low", count: data.byPriority.LOW, key: "LOW" },
    { name: "Medium", count: data.byPriority.MEDIUM, key: "MEDIUM" },
    { name: "High", count: data.byPriority.HIGH, key: "HIGH" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of issue tracking metrics and workload distributions.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Total Issues</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {data.total}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Assigned to Me</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-indigo-600">
            {data.assignedToMe}
          </div>
        </div>
      </div>

      {/* Bar Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Issues by Status */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Issues by Status
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(243, 244, 246, 0.6)" }}
                  contentStyle={{
                    borderRadius: "0.375rem",
                    borderColor: "#E5E7EB",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Priority */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Issues by Priority
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(243, 244, 246, 0.6)" }}
                  contentStyle={{
                    borderRadius: "0.375rem",
                    borderColor: "#E5E7EB",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((entry) => (
                    <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Assigned to me */}
      <AssignedToMeSection />
    </div>
  );
}

function AssignedToMeList({ userId }: { userId: number }) {
  const {
    data: issues,
    isLoading,
    isError,
    error,
  } = useIssues({
    status: "all",
    priority: "all",
    assignedToId: userId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : "Failed to load assigned issues."}
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        Nothing assigned to you
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Title
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">
              Priority
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/issues/${issue.id}`}
                  className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {issue.title}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={issue.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <PriorityBadge priority={issue.priority} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignedToMeSection() {
  const {
    data: currentUser,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
  } = useCurrentUser();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        Assigned to me
      </h2>

      {isUserLoading ? (
        <div className="flex justify-center py-8" role="status" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="sr-only">Loading...</span>
        </div>
      ) : isUserError || !currentUser ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {userError instanceof Error ? userError.message : "Failed to load user."}
        </div>
      ) : (
        <AssignedToMeList userId={currentUser.id} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
