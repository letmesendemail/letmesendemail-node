export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal | null;
}

export class RecordingMock {
  public requests: RecordedRequest[] = [];
  private responseStatus: number;
  private responseBody: unknown;
  private responseHeaders: Record<string, string>;

  constructor(status = 200, body: unknown = {}, headers?: Record<string, string>) {
    this.responseStatus = status;
    this.responseBody = body;
    this.responseHeaders = { "content-type": "application/json", ...headers };
  }

  get fetchFn(): typeof fetch {
    return (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
      const rawHeaders = init?.headers;
      const recHeaders: Record<string, string> = {};
      if (rawHeaders instanceof Headers) {
        rawHeaders.forEach((v, k) => {
          recHeaders[k] = v;
        });
      } else if (rawHeaders && !Array.isArray(rawHeaders)) {
        Object.assign(recHeaders, rawHeaders);
      } else if (Array.isArray(rawHeaders)) {
        for (const [k, v] of rawHeaders) recHeaders[k] = v;
      }
      let recBody: unknown;
      if (init?.body) recBody = JSON.parse(init.body as string);
      this.requests.push({
        method: init?.method ?? "GET",
        url,
        headers: recHeaders,
        body: recBody,
        signal: init?.signal ?? null,
      });
      const resp = new Response(JSON.stringify(this.responseBody), {
        status: this.responseStatus,
        headers: this.responseHeaders,
      });
      return Promise.resolve(resp);
    };
  }

  get fetchErrorFn(): (msg: string, type: "timeout" | "network") => typeof fetch {
    return (msg: string, type: "timeout" | "network") => {
      return (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
        const rawHeaders = init?.headers;
        const recHeaders: Record<string, string> = {};
        if (rawHeaders instanceof Headers) {
          rawHeaders.forEach((v, k) => {
            recHeaders[k] = v;
          });
        } else if (rawHeaders && !Array.isArray(rawHeaders)) {
          Object.assign(recHeaders, rawHeaders);
        } else if (Array.isArray(rawHeaders)) {
          for (const [k, v] of rawHeaders) recHeaders[k] = v;
        }
        this.requests.push({
          method: init?.method ?? "GET",
          url,
          headers: recHeaders,
          body: init?.body ? JSON.parse(init.body as string) : undefined,
          signal: init?.signal ?? null,
        });
        if (type === "timeout") {
          return Promise.reject(new DOMException("The operation was aborted", "TimeoutError"));
        }
        return Promise.reject(new TypeError(msg));
      };
    };
  }

  install(): () => void {
    const original = globalThis.fetch;
    globalThis.fetch = this.fetchFn;
    return () => {
      globalThis.fetch = original;
    };
  }
}

export function mockFetch(
  status = 200,
  body: unknown = {},
  headers?: Record<string, string>,
): RecordingMock {
  return new RecordingMock(status, body, headers);
}

export function installMock(mock: RecordingMock): () => void {
  return mock.install();
}
