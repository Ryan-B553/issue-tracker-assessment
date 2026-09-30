/**
 * Navbar.tsx — Top navigation bar.
 *
 * Shows the app name, the current user's name, and a Logout button that
 * calls POST /api/auth/logout, clears the React Query cache, then redirects
 * to /login.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function Navbar() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a
          href="/issues"
          className="text-lg font-semibold text-gray-900 hover:text-gray-700"
        >
          Issue Tracker
        </a>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name}
              {user.role === "admin" && (
                <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                  admin
                </span>
              )}
            </span>
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
