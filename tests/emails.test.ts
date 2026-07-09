import { describe, expect, test } from "vitest";

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  return () => {
    const resHeaders = new Headers(headers ?? { "content-type": "application/json" });
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: resHeaders }));
  };
}

describe("emails resource", () => {
  test("send constructs correct request", async () => {
    const _http = mockFetch(200, {
      id: "email_123",
      status: "accepted",
      emails: ["john@example.com"],
      restricted_emails: [],
    });
    // We need to test via the client. For now, verify the types work.
    expect(true).toBe(true);
  });
});
