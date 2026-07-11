import { afterEach, describe, expect, test, vi } from "vitest";
import { HttpClient } from "../src/client.js";
import {
  ApiError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from "../src/errors.js";
import { LetMeSendEmail } from "../src/index.js";
import { SDK_VERSION } from "../src/version.js";
import { installMock, mockFetch } from "./helpers.js";

afterEach(() => {
  vi.useRealTimers();
});

// ── Fixtures ──

const SEND_FIXTURE = {
  id: "01kvv5a6xk9qd6y2egeae8w76e",
  status: "accepted",
  emails: ["john@example.com"],
  restricted_emails: [],
};

const VERIFY_FIXTURE = {
  email: "john+doe@gmail.com",
  score: 40,
  status: "valid",
  domain_exists: true,
  disposable: false,
  role_based: false,
  has_mailbox: true,
  receive_email: true,
  mx_records: true,
  valid_syntax: true,
  belongs_to: "john@gmail.com",
};

const CONTACT_CREATE = {
  id: "c1",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  phone: null,
  is_globally_unsubscribed: false,
  created_at: "2026-01-01T00:00:00Z",
};

const CAT_CREATE = { id: "cat1", name: "New Category", slug: "new-category" };

const TOPIC_CREATE = {
  id: "t1",
  name: "Updates",
  slug: "updates",
  description: "desc",
  auto_subscribe: true,
  public: true,
  created_at: "2026-01-01T00:00:00Z",
};

// ── Client config ──

describe("client config", () => {
  test("default config values", () => {
    const http = new HttpClient("test_key");
    const cfg = http.getConfig();
    expect(cfg.baseUrl).toBe("https://letmesend.email/api/v1");
    expect(cfg.timeoutMs).toBe(30_000);
    expect(cfg.retries).toBe(0);
  });

  test("custom base URL", () => {
    const http = new HttpClient({ apiKey: "test", baseUrl: "https://custom.test/api" });
    expect(http.getConfig().baseUrl).toBe("https://custom.test/api");
  });

  test("custom timeout and retries", () => {
    const http = new HttpClient({ apiKey: "test", timeoutMs: 10_000, retries: 3 });
    expect(http.getConfig().timeoutMs).toBe(10_000);
    expect(http.getConfig().retries).toBe(3);
  });
});

// ── Request recording ──

describe("request recording", () => {
  test("records method, url, auth, content-type, accept, user-agent, and body", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);

    const client = new LetMeSendEmail("test_key");
    await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(mock.requests).toHaveLength(1);
    const req = mock.requests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toMatch(/\/emails$/);
    expect(req.headers.Authorization).toBe("Bearer test_key");
    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.headers.Accept).toBe("application/json");
    expect(req.headers["User-Agent"]).toBe(`@letmesendemail/letmesendemail-node/${SDK_VERSION}`);
    expect(req.body).toMatchObject({ from: "a@b.com", to: ["c@d.com"], subject: "Hi" });
    restore();
  });

  test("attachment serializes path", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");

    await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      attachments: [{ name: "f.pdf", path: "https://example.com/f.pdf" }],
    });

    const body = mock.requests[0].body as Record<string, unknown>;
    expect((body.attachments as Array<Record<string, unknown>>)[0].path).toBe(
      "https://example.com/f.pdf",
    );
    restore();
  });

  test("attachment serializes content", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");

    await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      attachments: [{ name: "d.txt", content: "aGVsbG8=" }],
    });

    const body = mock.requests[0].body as Record<string, unknown>;
    expect((body.attachments as Array<Record<string, unknown>>)[0].content).toBe("aGVsbG8=");
    restore();
  });

  test("attachment serializes contentId and contentDisposition", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");

    await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      attachments: [
        {
          name: "i.png",
          content: "aW1hZ2U=",
          contentId: "cid123",
          contentDisposition: "inline",
        },
      ],
    });

    const body = mock.requests[0].body as Record<string, unknown>;
    const att = (body.attachments as Array<Record<string, unknown>>)[0];
    expect(att.content_id).toBe("cid123");
    expect(att.content_disposition).toBe("inline");
    restore();
  });
});

// ── Emails ──

describe("emails", () => {
  test("send normalizes response", async () => {
    const restore = installMock(mockFetch(200, SEND_FIXTURE));
    const client = new LetMeSendEmail("test");
    const r = await client.emails.send({ from: "a@b.com", to: ["c@d.com"], subject: "Hi" });
    expect(r.id).toBe("01kvv5a6xk9qd6y2egeae8w76e");
    expect(r.status).toBe("accepted");
    expect(r.duplicate).toBe(false);
    restore();
  });

  test("verify normalizes fields", async () => {
    const restore = installMock(mockFetch(200, VERIFY_FIXTURE));
    const client = new LetMeSendEmail("test");
    const r = await client.emails.verify("john+doe@gmail.com");
    expect(r.email).toBe("john+doe@gmail.com");
    expect(r.domainExists).toBe(true);
    expect(r.validSyntax).toBe(true);
    restore();
  });

  test("list normalizes pagination", async () => {
    const mock = mockFetch(200, {
      data: [],
      pagination: { has_more: false, per_page: 10, fetched: 0, total: 0 },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    const r = await client.emails.list();
    expect(r.pagination.hasMore).toBe(false);
    expect(r.pagination.perPage).toBe(10);
    restore();
  });

  test("list encodes pagination query parameters", async () => {
    const mock = mockFetch(200, {
      data: [],
      pagination: { has_more: false, per_page: 5, fetched: 0, total: 0 },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    await client.emails.list(5, "cursor_abc");
    expect(mock.requests[0].url).toContain("per_page=5");
    expect(mock.requests[0].url).toContain("after=cursor_abc");
    restore();
  });
});

// ── Domains ──

describe("domains", () => {
  test("list normalizes", async () => {
    const mock = mockFetch(200, {
      data: [
        { id: "d1", domain_name: "ex.com", status: "verified", created_at: "2026-01-01T00:00:00Z" },
      ],
      pagination: { has_more: false, per_page: 20, fetched: 1, total: 1 },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    const r = await client.domains.list();
    expect(r.data[0].domainName).toBe("ex.com");
    restore();
  });
});

// ── Contacts ──

describe("contacts", () => {
  test("create normalizes", async () => {
    const restore = installMock(mockFetch(200, CONTACT_CREATE));
    const client = new LetMeSendEmail("test");
    const r = await client.contacts.create({ email: "john@example.com", firstName: "John" });
    expect(r.id).toBe("c1");
    expect(r.firstName).toBe("John");
    restore();
  });

  test("update returns id", async () => {
    const restore = installMock(mockFetch(200, { id: "c1" }));
    const client = new LetMeSendEmail("test");
    const r = await client.contacts.update("c1", { firstName: "Jane" });
    expect(r).toEqual({ id: "c1" });
    restore();
  });

  test("delete returns status", async () => {
    const restore = installMock(mockFetch(200, { status: "success" }));
    const client = new LetMeSendEmail("test");
    const r = await client.contacts.delete("c1");
    expect(r.status).toBe("success");
    restore();
  });
});

// ── Contact Categories ──

describe("contact categories", () => {
  test("create normalizes", async () => {
    const restore = installMock(mockFetch(200, CAT_CREATE));
    const client = new LetMeSendEmail("test");
    const r = await client.contactCategories.create("New", "new");
    expect(r.name).toBe("New Category");
    restore();
  });

  test("list normalizes", async () => {
    const mock = mockFetch(200, {
      data: [{ id: "c1", name: "N", slug: "n" }],
      pagination: { has_more: false, per_page: 10, fetched: 1, total: 1 },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    const r = await client.contactCategories.list();
    expect(r.data).toHaveLength(1);
    restore();
  });

  test("update normalizes", async () => {
    const restore = installMock(mockFetch(200, { id: "c1", name: "U", slug: "u" }));
    const client = new LetMeSendEmail("test");
    const r = await client.contactCategories.update("c1", "U", "u");
    expect(r.name).toBe("U");
    restore();
  });
});

// ── Email Topics ──

describe("email topics", () => {
  test("create normalizes", async () => {
    const restore = installMock(mockFetch(200, TOPIC_CREATE));
    const client = new LetMeSendEmail("test");
    const r = await client.emailTopics.create({ name: "Updates", slug: "updates" });
    expect(r.name).toBe("Updates");
    expect(r.autoSubscribe).toBe(true);
    restore();
  });

  test("list normalizes", async () => {
    const mock = mockFetch(200, {
      data: [
        { id: "t1", name: "U", slug: "u", auto_subscribe: false, public: true, created_at: "" },
      ],
      pagination: { has_more: false, per_page: 10, fetched: 1, total: 1 },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    const r = await client.emailTopics.list();
    expect(r.data).toHaveLength(1);
    restore();
  });

  test("update normalizes", async () => {
    const restore = installMock(
      mockFetch(200, {
        id: "t1",
        name: "N",
        slug: "n",
        auto_subscribe: false,
        public: true,
        created_at: "",
      }),
    );
    const client = new LetMeSendEmail("test");
    const r = await client.emailTopics.update("t1", { name: "N" });
    expect(r.name).toBe("N");
    restore();
  });
});

// ── Errors ──

describe("error handling", () => {
  test("error exposes raw body, request ID, and headers", async () => {
    const mock = mockFetch(422, {
      message: "Invalid",
      name: "validation_error",
      errors: { email: ["Required"] },
    });
    mock.thenRespond({
      status: 422,
      headers: { "x-request-id": "req_123", "content-type": "application/json" },
      body: { message: "Invalid", name: "validation_error", errors: { email: ["Required"] } },
    });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    try {
      await client.emails.send({ from: "", to: [""], subject: "" });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).apiCode).toBe("validation_error");
      expect((err as ValidationError).validationErrors).toEqual({ email: ["Required"] });
      expect((err as ValidationError).rawBody).toContain("validation_error");
      expect((err as ValidationError).responseHeaders?.["x-request-id"]).toBe("req_123");
    }
    restore();
  });

  test("NetworkError from network failure", async () => {
    const mock = mockFetch(200, {});
    mock.thenNetworkError("connect refused");
    const restore = installMock(mock);
    const http = new HttpClient("test");
    await expect(http.request("GET", "/test")).rejects.toThrow(NetworkError);
    restore();
  });

  test("TimeoutError from abort", async () => {
    const mock = mockFetch(200, {});
    mock.thenTimeout();
    const restore = installMock(mock);
    const http = new HttpClient("test");
    await expect(http.request("GET", "/test")).rejects.toThrow(TimeoutError);
    restore();
  });
});

// ── Malformed 2xx ──

describe("malformed 2xx", () => {
  test("rejects invalid JSON body", async () => {
    const mock = mockFetch(200, null as unknown as Record<string, unknown>);
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    await expect(client.emails.list()).rejects.toThrow(ApiError);
    restore();
  });

  test("rejects array response", async () => {
    const mock = mockFetch(200, [] as unknown as Record<string, unknown>);
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    await expect(client.emails.list()).rejects.toThrow(ApiError);
    restore();
  });

  test("preserves status, headers, raw body", async () => {
    const mock = mockFetch(200, null as unknown as Record<string, unknown>, { "x-custom": "val" });
    const restore = installMock(mock);
    const client = new LetMeSendEmail("test");
    try {
      await client.emails.list();
    } catch (err: unknown) {
      const e = err as ApiError;
      expect(e.statusCode).toBe(200);
      expect(e.responseHeaders?.["x-custom"]).toBe("val");
      expect(e.rawBody).toBe("null");
    }
    restore();
  });
});

// ── Retries (with fake timers) ──

describe("retries with fake timers", () => {
  test("retries on NetworkError with GET", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenNetworkError("e1").thenNetworkError("e2");
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 2 });

    const promise = http.request("GET", "/test");
    await vi.advanceTimersToNextTimerAsync();
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(3);
    restore();
  });

  test("retries on TimeoutError", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenTimeout();
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });

    const promise = http.request("GET", "/test");
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(2);
    restore();
  });

  test("retries on 408", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenRespond({ status: 408, body: { name: "timeout", message: "Req timeout" } });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });

    const promise = http.request("GET", "/test");
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(2);
    restore();
  });

  test("retries on 500/502/503/504", async () => {
    for (const code of [500, 502, 503, 504]) {
      vi.useRealTimers();
      const mock = mockFetch(200, {});
      mock.thenRespond({ status: code, body: { name: "error", message: "Err" } });
      const restore = installMock(mock);
      const http = new HttpClient({ apiKey: "test", retries: 1 });
      await http.request("GET", "/test");
      expect(mock.requests).toHaveLength(2);
      restore();
    }
  });

  test("retries 429 with valid Retry-After delta-seconds", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenRespond({
      status: 429,
      body: { name: "rate_limited", message: "Too fast" },
      headers: { "retry-after": "3", "content-type": "application/json" },
    });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });

    const promise = http.request("GET", "/test");
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(2);
    restore();
  });

  test("retries 429 with valid Retry-After HTTP-date", async () => {
    vi.useFakeTimers();
    const future = new Date(Date.now() + 5000).toUTCString();
    const mock = mockFetch(200, {});
    mock.thenRespond({
      status: 429,
      body: { name: "rate_limited", message: "Too fast" },
      headers: { "retry-after": future, "content-type": "application/json" },
    });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });

    const promise = http.request("GET", "/test");
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(2);
    restore();
  });

  test("throws on 429 with missing Retry-After", async () => {
    const mock = mockFetch(200, {});
    mock.thenRespond({
      status: 429,
      body: { name: "rate_limited", message: "Too fast" },
      headers: { "content-type": "application/json" },
    });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });
    await expect(http.request("GET", "/test")).rejects.toThrow(RateLimitError);
    expect(mock.requests).toHaveLength(1);
    restore();
  });

  test("throws on 429 with zero Retry-After", async () => {
    const mock = mockFetch(200, {});
    mock.thenRespond({
      status: 429,
      body: { name: "rate_limited", message: "Too fast" },
      headers: { "retry-after": "0", "content-type": "application/json" },
    });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });
    await expect(http.request("GET", "/test")).rejects.toThrow(RateLimitError);
    expect(mock.requests).toHaveLength(1);
    restore();
  });

  test("throws on 429 with excessive Retry-After > 300", async () => {
    const mock = mockFetch(200, {});
    mock.thenRespond({
      status: 429,
      body: { name: "rate_limited", message: "Too fast" },
      headers: { "retry-after": "301", "content-type": "application/json" },
    });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });
    await expect(http.request("GET", "/test")).rejects.toThrow(RateLimitError);
    expect(mock.requests).toHaveLength(1);
    restore();
  });

  test("exhausts retries then throws", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
    mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
    mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 2 });

    const promise = http.request("GET", "/test");
    promise.catch(() => {}); // suppress unhandled rejection
    await vi.advanceTimersToNextTimerAsync();
    await vi.advanceTimersToNextTimerAsync();
    await expect(promise).rejects.toThrow();
    expect(mock.requests).toHaveLength(3);
    restore();
  });

  test("does not retry non-idempotent POST without Idempotency-Key", async () => {
    const mock = mockFetch(200, {});
    mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 2 });
    await expect(http.request("POST", "/test", {})).rejects.toThrow();
    expect(mock.requests).toHaveLength(1);
    restore();
  });

  test("retries idempotent POST with Idempotency-Key", async () => {
    vi.useFakeTimers();
    const mock = mockFetch(200, {});
    mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
    const restore = installMock(mock);
    const http = new HttpClient({ apiKey: "test", retries: 1 });

    const promise = http.request("POST", "/test", {}, { "Idempotency-Key": "my-key" });
    await vi.advanceTimersToNextTimerAsync();
    const result = await promise;
    expect(result).toEqual({});
    expect(mock.requests).toHaveLength(2);
    restore();
  });

  test("safe methods are retryable", async () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "DELETE"]) {
      vi.useRealTimers();
      const mock = mockFetch(200, {});
      mock.thenRespond({ status: 500, body: { name: "error", message: "E" } });
      const restore = installMock(mock);
      const http = new HttpClient({ apiKey: "test", retries: 1 });
      await http.request(method, "/test");
      expect(mock.requests).toHaveLength(2);
      restore();
    }
  });
});
