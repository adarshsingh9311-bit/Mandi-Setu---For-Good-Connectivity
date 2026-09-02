const DEFAULT_API_URL = "http://127.0.0.1:8000";

export function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || DEFAULT_API_URL;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`);
  if (!response.ok) {
    throw new Error(`API ${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
}
