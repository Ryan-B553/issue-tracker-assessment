/**
 * Providers.tsx — Client-side providers wrapper.
 *
 * Wraps the app with QueryClientProvider so all child components can use
 * React Query hooks. Must be a Client Component because QueryClient is
 * stateful on the browser.
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session; useState prevents re-creation on re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute default
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
