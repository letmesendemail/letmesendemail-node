import type { LetMeSendEmailConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import { errorFromStatusCode, NetworkError, TimeoutError } from "./errors.js";

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

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `@letmesendemail/letmesendemail-node/${"0.1.0"}`,
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

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    let responseBody: Record<string, unknown>;
    try {
      responseBody = (await response.json()) as Record<string, unknown>;
    } catch {
      responseBody = {};
    }

    if (response.status >= 400) {
      throw errorFromStatusCode(response.status, responseBody, responseHeaders);
    }

    return responseBody;
  }
}
