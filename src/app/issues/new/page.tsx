/**
 * /issues/new/page.tsx — Create issue page.
 *
 * Form: title (required), description (optional), priority dropdown,
 * optional assignee dropdown. Uses React Query's useMutation to POST
 * /api/issues, maps field-level API errors back to the form, invalidates
 * the issues list cache on success, then navigates to the new issue.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { useUsers } from "@/hooks/useUsers";
import { apiFetch, ApiError } from "@/lib/api";
import type { Issue, Priority } from "@/hooks/useIssues";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CreateIssueBody {
  title: string;
  description?: string;
  priority: Priority;
  assignedToId?: number;
}

type FieldErrors = Partial<Record<keyof CreateIssueBody, string>>;

// ─── Small shared form primitives ──────────────────────────────────────────────

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

// ─── Form content ──────────────────────────────────────────────────────────────

function NewIssueForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: users } = useUsers();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");

  const mutation = useMutation({
    mutationFn: (body: CreateIssueBody) =>
      apiFetch<{ issue: Issue }>("/api/issues", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      router.push(`/issues/${data.issue.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.data) {
        const d = err.data as { error?: unknown };
        if (typeof d.error === "object" && d.error !== null) {
          // field-level errors
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
    if (mutation.isPending || mutation.isSuccess) return;
    setFieldErrors({});
    setGlobalError("");

    const body: CreateIssueBody = {
      title: title.trim(),
      priority,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(assignedToId ? { assignedToId: Number(assignedToId) } : {}),
    };

    mutation.mutate(body);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/issues"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to issues
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-gray-900">New Issue</h1>

        {globalError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <Label htmlFor="issue-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <input
              id="issue-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, descriptive title"
              className={inputCls}
              required
            />
            <FieldError message={fieldErrors.title} />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="issue-description">Description</Label>
            <textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, expected behaviour, context…"
              rows={5}
              className={inputCls}
            />
            <FieldError message={fieldErrors.description} />
          </div>

          {/* Priority + Assignee — side by side on wider screens */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Priority */}
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

            {/* Assignee */}
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

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/issues"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              id="btn-create-issue"
              type="submit"
              disabled={mutation.isPending || mutation.isSuccess}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {mutation.isPending || mutation.isSuccess ? "Creating…" : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewIssuePage() {
  return (
    <AuthGuard>
      <NewIssueForm />
    </AuthGuard>
  );
}
