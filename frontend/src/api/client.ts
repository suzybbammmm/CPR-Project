const runtimeApiBase = typeof window === 'undefined'
  ? 'http://localhost:8766'
  : `${window.location.protocol}//${window.location.hostname}:8766`;
const BASE = import.meta.env.VITE_API_URL ?? runtimeApiBase;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || (json && json.success === false)) {
    const code = json?.error?.code ?? 'UNKNOWN';
    const message = json?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(code, message, res.status);
  }

  return json as T;
}
