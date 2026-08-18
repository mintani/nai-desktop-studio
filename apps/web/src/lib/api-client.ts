import { env } from "@nai-desktop-studio/env/web";

const BASE_URL = env.VITE_SERVER_URL;

/**
 * The 428 the server returns. Signals a missing API key; the UI routes to
 * onboarding.
 */
export const API_KEY_REQUIRED_STATUS = 428;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** Whether the API key is unset. When true, show the setup screen. */
  get isApiKeyRequired() {
    return this.status === API_KEY_REQUIRED_STATUS;
  }
}

/**
 * Turns a server-relative path (e.g. `/images/<id>/file`) into an absolute URL
 * usable for display.
 */
export function serverUrl(path: string) {
  return `${BASE_URL}${path}`;
}

async function readError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (body?.error) return body.error;
  }
  const text = await response.text().catch(() => "");
  return text || `Request failed (${response.status})`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * JSON request to the local server. On failure it throws ApiError, so the caller
 * can branch on status (especially 428).
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
