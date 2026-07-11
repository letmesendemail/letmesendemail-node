import type { LetMeSendEmailConfig } from "./config.js";
import { MAX_RETRY_DELAY, resolveConfig } from "./config.js";
import {
  ApiError,
  errorFromStatusCode,
  LetMeSendEmailError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "./errors.js";
import { SDK_VERSION } from "./version.js";

const RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504]);

function isIdempotentMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS" || method === "DELETE";
}

function hasIdempotencyHeader(extraHeaders?: Record<string, string>): boolean {
  if (!extraHeaders) return false;
  for (const key of Object.keys(extraHeaders)) {
    if (key.toLowerCase() === "idempotency-key") return true;
  }
  return false;
}

function jitter(ms: number): number {
  return Math.floor(ms * (0.5 + Math.random() * 0.5));
}

export class HttpClient {
  private config: Required<LetMeSendEmailConfig>;

  constructor(configOrKey: string | LetMeSendEmailConfig) {
    this.config = resolveConfig(configOrKey);
  }

  getConfig(): Required<LetMeSendEmailConfig> {
    return this.config;
  }

  async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

    const mayRetry =
      this.config.retries > 0 && (isIdempotentMethod(method) || hasIdempotencyHeader(extraHeaders));

    const maxAttempts = mayRetry ? this.config.retries + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.send(method, url, body, extraHeaders);
      } catch (err: unknown) {
        if (!mayRetry || attempt === maxAttempts - 1) throw err;

        const delayMs = this.computeDelay(err, attempt);
        if (delayMs === null) throw err;
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    throw new Error("Request failed after exhausting retries.");
  }

  private computeDelay(err: unknown, attempt: number): number | null {
    if (err instanceof NetworkError || err instanceof TimeoutError) {
      const base = 100 * 2 ** attempt;
      return Math.min(jitter(base), MAX_RETRY_DELAY * 1000);
    }

    if (err instanceof RateLimitError) {
      const retryAfter = err.retryAfter;
      if (retryAfter === undefined || retryAfter <= 0) return null;
      if (retryAfter > MAX_RETRY_DELAY) return null;
      return retryAfter * 1000;
    }

    if (err instanceof LetMeSendEmailError && err.statusCode !== undefined) {
      if (err.statusCode === 429) return null;
      if (RETRYABLE_STATUSES.has(err.statusCode)) {
        const base = 100 * 2 ** attempt;
        return Math.min(jitter(base), MAX_RETRY_DELAY * 1000);
      }
    }

    return null;
  }

  private keepHeadersCase(headers: Headers): Record<string, string> {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  private async send(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `@letmesendemail/letmesendemail-node/${SDK_VERSION}`,
      ...extraHeaders,
    };

    const fetchInit: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };

    if (body !== undefined) {
      fetchInit.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, fetchInit);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new TimeoutError("Request timed out.");
      }
      throw new NetworkError(err instanceof Error ? err.message : "Network error");
    }

    const responseHeaders = this.keepHeadersCase(response.headers);

    const rawBody = await response.text();

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }

    if (response.status >= 400) {
      const bodyMap =
        parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
          ? (parsedBody as Record<string, unknown>)
          : {};
      throw errorFromStatusCode(response.status, bodyMap, responseHeaders, rawBody);
    }

    // Malformed 2xx response: reject non-object, arrays, null
    if (parsedBody === null || Array.isArray(parsedBody) || typeof parsedBody !== "object") {
      throw new ApiError(
        "Malformed response body",
        response.status,
        undefined,
        undefined,
        undefined,
        responseHeaders,
        rawBody,
      );
    }

    return parsedBody as Record<string, unknown>;
  }
}
