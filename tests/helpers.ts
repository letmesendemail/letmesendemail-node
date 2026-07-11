export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal | null;
}

export interface QueuedItem {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  error?: { message: string; type: "timeout" | "network" };
}

export class RecordingMock {
  public requests: RecordedRequest[] = [];
  private queue: QueuedItem[] = [];
  private defaultItem: QueuedItem;

  constructor(status = 200, body: unknown = {}, headers?: Record<string, string>) {
    this.defaultItem = { status, body, headers };
  }

  /** Queue a response. Each call to fetch shifts the next item. */
  thenRespond(item: QueuedItem): this {
    this.queue.push(item);
    return this;
  }

  /** Queue a network error. */
  thenNetworkError(message = "network error"): this {
    this.queue.push({ error: { message, type: "network" } });
    return this;
  }

  /** Queue a timeout. */
  thenTimeout(): this {
    this.queue.push({ error: { message: "timed out", type: "timeout" } });
    return this;
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

      const item = this.queue.shift() ?? this.defaultItem;

      if (item.error) {
        if (item.error.type === "timeout") {
          return Promise.reject(new DOMException("The operation was aborted", "TimeoutError"));
        }
        return Promise.reject(new TypeError(item.error.message));
      }

      const respBody = item.body !== undefined ? item.body : this.defaultItem.body;
      const respStatus = item.status ?? this.defaultItem.status;
      const respHeaders: Record<string, string> = {
        "content-type": "application/json",
        ...(item.headers ?? this.defaultItem.headers),
      };
      return Promise.resolve(
        new Response(JSON.stringify(respBody), { status: respStatus, headers: respHeaders }),
      );
    };
  }

  install(): () => void {
    const original = globalThis.fetch;
    globalThis.fetch = this.fetchFn;
    return () => {
      globalThis.fetch = original;
    };
  }

  /** Use in afterEach / finally to restore global fetch unconditionally. */
  static restore: (() => void) | null = null;

  /** Install the mock and record the restore function globally. */
  installPersistent(): void {
    RecordingMock.restore?.();
    const original = globalThis.fetch;
    globalThis.fetch = this.fetchFn;
    RecordingMock.restore = () => {
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
