import type { LetMeSendEmailConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import {
  errorFromStatusCode,
  LetMeSendEmailError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "./errors.js";

const version = "0.2.0";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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
      if (attempt > 0) {
        const base = 100 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, jitter(base)));
      }

      try {
        return await this.send(method, url, body, extraHeaders);
      } catch (err: unknown) {
        if (!mayRetry || attempt === maxAttempts - 1) throw err;
        if (err instanceof NetworkError || err instanceof TimeoutError) continue;
        if (err instanceof RateLimitError) {
          const retryAfter = err.retryAfter;
          if (retryAfter !== undefined && retryAfter > 0) {
            await new Promise((r) => setTimeout(r, jitter(retryAfter * 1000)));
          }
          continue;
        }
        if (err instanceof LetMeSendEmailError && err.statusCode !== undefined) {
          if (RETRYABLE_STATUSES.has(err.statusCode)) continue;
        }
        throw err;
      }
    }

    throw new Error("Request failed after exhausting retries.");
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
      "User-Agent": `@letmesendemail/letmesendemail-node/${version}`,
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

    let responseBody: Record<string, unknown>;
    try {
      responseBody = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      responseBody = {};
    }

    if (response.status >= 400) {
      throw errorFromStatusCode(response.status, responseBody, responseHeaders, rawBody);
    }

    return responseBody;
  }
}
