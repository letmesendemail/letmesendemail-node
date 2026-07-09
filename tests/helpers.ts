export function mockFetch(status: number, body: unknown, headers?: Record<string, string>): () => Promise<Response> {
  const resHeaders = new Headers(headers ?? { "content-type": "application/json" });
  return () => Promise.resolve(new Response(JSON.stringify(body), { status, headers: resHeaders }));
}

export function mockFetchNetworkError() {
  return () => Promise.reject(new TypeError("fetch failed"));
}

export function mockFetchTimeout() {
  return () => {
    const err = new DOMException("The operation was aborted", "TimeoutError");
    return Promise.reject(err);
  };
}
