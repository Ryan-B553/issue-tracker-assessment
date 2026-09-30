/**
 * useCurrentUser.ts — React Query hook for the authenticated user.
 *
 * Calls GET /api/auth/me and caches the result. Returns null when unauthenticated
 * (401 is treated as "no user" rather than an error).
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const data = await apiFetch<{ user: CurrentUser }>("/api/auth/me");
        return data.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
