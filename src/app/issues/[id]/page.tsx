/**
 * /issues/[id]/page.tsx — Issue detail and edit page.
 *
 * Client component wrapped in AuthGuard. Fetches issue details with comments,
 * provides inline status updates and full editing permissions for admin, creator,
 * or assignee, and allows any authenticated user to post comments.
 */

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useUsers } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiFetch, ApiError } from "@/lib/api";
import type { Priority, Status } from "@/hooks/useIssues";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface IssueComment {
  id: number;
  body: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
  };
}

export interface IssueDetail {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  assignedToId: number | null;
  createdBy: {
    id: number;
    name: string;
  };
  assignedTo: {
    id: number;
    name: string;
  } | null;
  comments: IssueComment[];
}

interface EditIssueBody {
  title: string;
  description: string | null;
  priority: Priority;
  assignedToId: number | null;
}

type FieldErrors = Partial<Record<keyof EditIssueBody, string>>;

// ─── Shared UI Helpers ─────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const selectCls =
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

// ─── Edit Issue Form ───────────────────────────────────────────────────────────

function EditIssueForm({
  issue,
  rawId,
}: {
  issue: IssueDetail;
  rawId: string;
}) {
  const queryClient = useQueryClient();
  const { data: users } = useUsers();

  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description ?? "");
  const [priority, setPriority] = useState<Priority>(issue.priority);
  const [assignedToId, setAssignedToId] = useState<string>(
    issue.assignedToId ? String(issue.assignedToId) : ""
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const editMutation = useMutation({
    mutationFn: (body: EditIssueBody) =>
      apiFetch<{ issue: IssueDetail }>(`/api/issues/${rawId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setFieldErrors({});
      setGlobalError("");
      setSuccessMessage("Issue updated successfully.");
      setTitle(data.issue.title);
      setDescription(data.issue.description ?? "");
      setPriority(data.issue.priority);
      setAssignedToId(data.issue.assignedToId ? String(data.issue.assignedToId) : "");
      queryClient.invalidateQueries({ queryKey: ["issue", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setSuccessMessage("");
      if (err instanceof ApiError && err.data) {
        const d = err.data as { error?: unknown };
        if (typeof d.error === "object" && d.error !== null) {
          const errs = d.error as Record<string, string[]>;
          setFieldErrors(
            Object.fromEntries(
              Object.entries(errs).map(([k, v]) => [k, v[0]])
            ) as FieldErrors
          );
          return;
        }
      }
      setGlobalError(err instanceof Error ? err.message : "Something went wrong.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editMutation.isPending) return;
    setFieldErrors({});
    setGlobalError("");
    setSuccessMessage("");

    const body: EditIssueBody = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      priority,
      assignedToId: assignedToId ? Number(assignedToId) : null,
    };

    editMutation.mutate(body);
  }

  function handleReset() {
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setPriority(issue.priority);
    setAssignedToId(issue.assignedToId ? String(issue.assignedToId) : "");
    setFieldErrors({});
    setGlobalError("");
    setSuccessMessage("");
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Edit Issue</h2>

      {globalError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="issue-title">
            Title <span className="text-red-500">*</span>
          </Label>
          <input
            id="issue-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            required
          />
          <FieldError message={fieldErrors.title} />
        </div>

        <div>
          <Label htmlFor="issue-description">Description</Label>
          <textarea
            id="issue-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputCls}
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="issue-priority">Priority</Label>
            <select
              id="issue-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={selectCls}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <FieldError message={fieldErrors.priority} />
          </div>

          <div>
            <Label htmlFor="issue-assignee">Assignee</Label>
            <select
              id="issue-assignee"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className={selectCls}
            >
              <option value="">Unassigned</option>
              {(users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.assignedToId} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={editMutation.isPending}
            onClick={handleReset}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60 transition-colors"
          >
            Reset
          </button>
          <button
            id="btn-save-issue"
            type="submit"
            disabled={editMutation.isPending}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {editMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Issue Detail Component ──────────────────────────────────────────────

function IssueDetailContent() {
  const params = useParams();
  const rawId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const numericId = Number(rawId);
  const isValidId = Boolean(rawId && Number.isInteger(numericId) && numericId > 0);

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [statusError, setStatusError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");

  const {
    data: issue,
    isLoading,
    isError,
    error,
  } = useQuery<IssueDetail>({
    queryKey: ["issue", rawId],
    queryFn: async () => {
      const res = await apiFetch<{ issue: IssueDetail }>(`/api/issues/${rawId}`);
      return res.issue;
    },
    enabled: isValidId,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && [400, 403, 404].includes(err.status)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: Status) =>
      apiFetch<{ issue: IssueDetail }>(`/api/issues/${rawId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      setStatusError("");
      queryClient.invalidateQueries({ queryKey: ["issue", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (err) => {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    },
  });

  const commentMutation = useMutation({
    mutationFn: (bodyText: string) =>
      apiFetch<{ comment: IssueComment }>(`/api/issues/${rawId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: bodyText }),
      }),
    onSuccess: () => {
      setCommentBody("");
      setCommentError("");
      queryClient.invalidateQueries({ queryKey: ["issue", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues", rawId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.data) {
        const d = err.data as { error?: unknown };
        if (typeof d.error === "object" && d.error !== null) {
          const errs = d.error as Record<string, string[]>;
          const first = Object.values(errs)[0];
          if (Array.isArray(first)) {
            setCommentError(first[0]);
            return;
          }
        }
      }
      setCommentError(err instanceof Error ? err.message : "Failed to add comment.");
    },
  });

  function handleStatusChange(newStatus: Status) {
    if (!issue || newStatus === issue.status || statusMutation.isPending) return;
    setStatusError("");
    statusMutation.mutate(newStatus);
  }

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (commentMutation.isPending) return;
    const trimmed = commentBody.trim();
    if (!trimmed) {
      setCommentError("Comment body is required");
      return;
    }
    setCommentError("");
    commentMutation.mutate(trimmed);
  }

  if (!isValidId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">Issue not found</h2>
        <p className="mt-2 text-sm text-gray-500">Invalid issue ID provided.</p>
        <div className="mt-6">
          <Link
            href="/issues"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Back to issues
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    if (isNotFound) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-gray-900">Issue not found</h2>
          <p className="mt-2 text-sm text-gray-500">
            The issue you are looking for does not exist or has been removed.
          </p>
          <div className="mt-6">
            <Link
              href="/issues"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              Back to issues
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/issues"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to issues
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load issue."}
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">Issue not found</h2>
        <p className="mt-2 text-sm text-gray-500">The issue could not be found.</p>
        <div className="mt-6">
          <Link
            href="/issues"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Back to issues
          </Link>
        </div>
      </div>
    );
  }

  const roleLower = currentUser?.role?.toLowerCase();
  const isAdmin = roleLower === "admin";
  const isCreator = Boolean(currentUser && currentUser.id === issue.createdById);
  const isAssignee = Boolean(
    currentUser && issue.assignedToId !== null && currentUser.id === issue.assignedToId
  );
  const canEdit = isAdmin || isCreator || isAssignee;

  const sortedComments = [...(issue.comments ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to issues
        </Link>
      </div>

      {/* Main Issue Detail Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Header: Badges, Title, and optional Quick Status changer */}
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-400">#{issue.id}</span>
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
          </div>

          {canEdit && (
            <div className="flex flex-col sm:items-end gap-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="issue-status">Status:</Label>
                <select
                  id="issue-status"
                  value={issue.status}
                  disabled={statusMutation.isPending}
                  onChange={(e) => handleStatusChange(e.target.value as Status)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              {statusMutation.isPending && (
                <span className="text-xs font-medium text-indigo-600">Updating status…</span>
              )}
              {statusError && (
                <span className="text-xs font-medium text-red-600">{statusError}</span>
              )}
            </div>
          )}
        </div>

        {/* Metadata Row: Creator, Assignee, Dates */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-100 sm:grid-cols-4 text-sm">
          <div>
            <span className="block text-xs font-medium text-gray-500">Creator</span>
            <span className="font-medium text-gray-900">{issue.createdBy.name}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Assignee</span>
            <span className="font-medium text-gray-900">
              {issue.assignedTo?.name ?? "Unassigned"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Created</span>
            <span className="text-gray-700">{formatDate(issue.createdAt)}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Updated</span>
            <span className="text-gray-700">{formatDate(issue.updatedAt)}</span>
          </div>
        </div>

        {/* Description Section */}
        <div className="pt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Description
          </h2>
          {issue.description ? (
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {issue.description}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">No description provided.</p>
          )}
        </div>
      </div>

      {/* Edit Form: Visible only to admin, creator, or assignee */}
      {canEdit && <EditIssueForm key={issue.id} issue={issue} rawId={rawId} />}

      {/* Comments Section */}
      <div className="space-y-6 pt-2">
        <h2 className="text-lg font-bold text-gray-900">
          Comments ({issue.comments.length})
        </h2>

        {/* Comments List (oldest first) */}
        {sortedComments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No comments yet.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {comment.body}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">Add a comment</h3>

          {commentError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {commentError}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="comment-body">Comment</Label>
              <textarea
                id="comment-body"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write your comment here…"
                rows={3}
                className={inputCls}
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                id="btn-add-comment"
                type="submit"
                disabled={commentMutation.isPending || !commentBody.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors"
              >
                {commentMutation.isPending ? "Posting…" : "Add Comment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  return (
    <AuthGuard>
      <IssueDetailContent />
    </AuthGuard>
  );
}
