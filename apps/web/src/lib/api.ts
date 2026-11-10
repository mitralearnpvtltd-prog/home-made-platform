export type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  supabaseConfigured: boolean;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to apps/web/.env.local (for example http://localhost:3000/api/v1).",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseErrorMessage(response: Response): Promise<{ message: string; details: unknown }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data: unknown = await response.json();
      if (typeof data === "object" && data !== null && "message" in data) {
        const rawMessage = (data as { message?: string | string[] }).message;
        if (Array.isArray(rawMessage)) {
          return { message: rawMessage.join(", "), details: data };
        }
        if (typeof rawMessage === "string" && rawMessage.trim()) {
          return { message: rawMessage, details: data };
        }
      }
      return {
        message: `Request failed with status ${response.status}`,
        details: data,
      };
    } catch {
      return {
        message: `Request failed with status ${response.status}`,
        details: undefined,
      };
    }
  }

  try {
    const text = await response.text();
    return {
      message: text.trim() || `Request failed with status ${response.status}`,
      details: text || undefined,
    };
  } catch {
    return {
      message: `Request failed with status ${response.status}`,
      details: undefined,
    };
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers, signal } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(`Unable to reach the API: ${message}`, 0, error);
  }

  if (!response.ok) {
    const { message, details } = await parseErrorMessage(response);
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      `Expected JSON response but received "${contentType || "unknown"}"`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", { method: "GET", signal });
}
