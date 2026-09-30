/**
 * api.ts — Typed fetch helper.
 *
 * Wraps fetch, throws on non-OK responses with the server's error message
 * so callers never have to manually check response.ok.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Extracts a human-readable message from a JSON error payload. */
function extractMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string") return d.error;
  if (typeof d.error === "object" && d.error !== null) {
    // Field-level errors — join the first field's messages
    const firstField = Object.values(d.error as Record<string, string[]>)[0];
    if (Array.isArray(firstField)) return firstField.join(", ");
  }
  return "Request failed";
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data), data);
  }

  return data as T;
}
