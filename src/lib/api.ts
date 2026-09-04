// Same-origin /api in both environments; production can explicitly override this.
const DEFAULT_API_URL = "";

export function apiBase(): string {
  return (
    (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") || DEFAULT_API_URL
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("kisansetu-session") : null;
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers: { ...options?.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("Cannot reach the server. Make sure the backend is running and try again.");
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error("The backend is unavailable. Please start it and try again.");
  }
  if (!response.ok) {
    if (response.status === 401 && token && path !== "/api/auth/login") {
      window.dispatchEvent(new Event("session-expired"));
    }
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Unable to save or load data. Check your inputs and try again.",
    );
  }
  return response.json() as Promise<T>;
}
