/**
 * useUsers.ts — React Query hook for the users list.
 *
 * Fetches GET /api/users (id + name only) for use in assignee dropdowns.
 * Cached indefinitely within a session since user lists change rarely.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface UserOption {
  id: number;
  name: string;
}

export function useUsers() {
  return useQuery<UserOption[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await apiFetch<{ users: UserOption[] }>("/api/users");
      return data.users;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
