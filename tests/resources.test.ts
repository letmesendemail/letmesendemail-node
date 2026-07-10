import { describe, expect, test } from "vitest";
import { HttpClient } from "../src/client.js";
import { LetMeSendEmail } from "../src/index.js";
import { installMock, mockFetch } from "./helpers.js";

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

const LIST_FIXTURE = {
  data: [
    {
      id: "e1",
      status: "sent",
      subject: "Hello",
      event_name: null,
      type: "transactional",
      created_at: "2026-01-01T00:00:00Z",
      sent_at: null,
      recipients_count: 1,
      attachments_count: 0,
    },
  ],
  pagination: { has_more: false, per_page: 10, fetched: 1, total: 1 },
};

const SHOW_FIXTURE = {
  id: "e1",
  status: "sent",
  subject: "Hello",
  event_name: null,
  type: "transactional",
  created_at: "2026-01-01T00:00:00Z",
  sent_at: null,
  recipients_count: 1,
  attachments_count: 0,
  recipients: [],
  attachments: [],
};

const DOMAIN_LIST = {
  data: [
    {
      id: "d1",
      domain_name: "example.com",
      status: "verified",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  pagination: { has_more: false, per_page: 20, fetched: 1, total: 1 },
};

const DOMAIN_SHOW = {
  id: "d1",
  domain_name: "example.com",
  status: "verified",
  created_at: "2026-01-01T00:00:00Z",
};

const DOMAIN_VERIFY = { status: "verified" };

const CONTACT_CREATE = {
  id: "c1",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  phone: null,
  is_globally_unsubscribed: false,
  created_at: "2026-01-01T00:00:00Z",
};

const CONTACT_UPDATE = { id: "c1" };
const CONTACT_DELETE = { status: "success" };

const CAT_CREATE = { id: "cat1", name: "New Category", slug: "new-category" };
const CAT_DELETE = { status: "success" };

const TOPIC_CREATE = {
  id: "t1",
  name: "Updates",
  slug: "updates",
  description: "desc",
  auto_subscribe: true,
  public: true,
  created_at: "2026-01-01T00:00:00Z",
};

const TOPIC_DELETE = { status: "success", message: "Topic deleted" };

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

// ── Emails ──

describe("emails", () => {
  test("send normalizes response fields", async () => {
    const restore = installMock(mockFetch(200, SEND_FIXTURE));
    const client = new LetMeSendEmail("test");
    const result = await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result.id).toBe("01kvv5a6xk9qd6y2egeae8w76e");
    expect(result.status).toBe("accepted");
    expect(result.restrictedEmails).toEqual([]);
    expect(result.duplicate).toBe(false);
    restore();
  });

  test("verify normalizes domain_exists and valid_syntax", async () => {
    const restore = installMock(mockFetch(200, VERIFY_FIXTURE));
    const client = new LetMeSendEmail("test");
    const result = await client.emails.verify("john+doe@gmail.com");
    expect(result.email).toBe("john+doe@gmail.com");
    expect(result.domainExists).toBe(true);
    expect(result.validSyntax).toBe(true);
    expect(result.belongsTo).toBe("john@gmail.com");
    restore();
  });

  test("list normalizes pagination", async () => {
    const restore = installMock(mockFetch(200, LIST_FIXTURE));
    const client = new LetMeSendEmail("test");
    const result = await client.emails.list();
    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.perPage).toBe(10);
    expect(result.pagination.total).toBe(1);
    restore();
  });

  test("get normalizes response", async () => {
    const restore = installMock(mockFetch(200, SHOW_FIXTURE));
    const client = new LetMeSendEmail("test");
    const result = await client.emails.get("e1");
    expect(result.id).toBe("e1");
    expect(result.recipientsCount).toBe(1);
    restore();
  });

  test("send with template works", async () => {
    const restore = installMock(mockFetch(200, SEND_FIXTURE));
    const client = new LetMeSendEmail("test");
    const result = await client.emails.sendWithTemplate({
      from: "a@b.com",
      to: ["c@d.com"],
      templateId: "t1",
    });
    expect(result.id).toBeTruthy();
    restore();
  });
});

// ── Domains ──

describe("domains", () => {
  test("list normalizes domain_name", async () => {
    const restore = installMock(mockFetch(200, DOMAIN_LIST));
    const client = new LetMeSendEmail("test");
    const result = await client.domains.list();
    expect(result.data[0].domainName).toBe("example.com");
    expect(result.pagination.hasMore).toBe(false);
    restore();
  });

  test("get normalizes single domain", async () => {
    const restore = installMock(mockFetch(200, DOMAIN_SHOW));
    const client = new LetMeSendEmail("test");
    const result = await client.domains.get("d1");
    expect(result.domainName).toBe("example.com");
    expect(result.status).toBe("verified");
    restore();
  });

  test("verify returns status", async () => {
    const restore = installMock(mockFetch(200, DOMAIN_VERIFY));
    const client = new LetMeSendEmail("test");
    const result = await client.domains.verify("example.com");
    expect(result.status).toBe("verified");
    restore();
  });
});

// ── Contacts ──

describe("contacts", () => {
  test("create normalizes contact", async () => {
    const restore = installMock(mockFetch(200, CONTACT_CREATE));
    const client = new LetMeSendEmail("test");
    const result = await client.contacts.create({ email: "john@example.com" });
    expect(result.id).toBe("c1");
    expect(result.email).toBe("john@example.com");
    expect(result.firstName).toBe("John");
    restore();
  });

  test("update returns partial { id }", async () => {
    const restore = installMock(mockFetch(200, CONTACT_UPDATE));
    const client = new LetMeSendEmail("test");
    const result = await client.contacts.update("c1", { firstName: "Jane" });
    expect(result).toEqual({ id: "c1" });
    restore();
  });

  test("delete returns status", async () => {
    const restore = installMock(mockFetch(200, CONTACT_DELETE));
    const client = new LetMeSendEmail("test");
    const result = await client.contacts.delete("c1");
    expect(result.status).toBe("success");
    restore();
  });
});

// ── Contact Categories ──

describe("contact categories", () => {
  test("create/update normalizes", async () => {
    const restore = installMock(mockFetch(200, CAT_CREATE));
    const client = new LetMeSendEmail("test");
    const cat = await client.contactCategories.create("New Category", "new-category");
    expect(cat.name).toBe("New Category");
    expect(cat.slug).toBe("new-category");
    restore();
  });

  test("delete returns status", async () => {
    const restore = installMock(mockFetch(200, CAT_DELETE));
    const client = new LetMeSendEmail("test");
    const result = await client.contactCategories.delete("cat1");
    expect(result.status).toBe("success");
    restore();
  });
});

// ── Email Topics ──

describe("email topics", () => {
  test("create normalizes", async () => {
    const restore = installMock(mockFetch(200, TOPIC_CREATE));
    const client = new LetMeSendEmail("test");
    const t = await client.emailTopics.create({ name: "Updates", slug: "updates" });
    expect(t.name).toBe("Updates");
    expect(t.autoSubscribe).toBe(true);
    restore();
  });

  test("delete returns status with message", async () => {
    const restore = installMock(mockFetch(200, TOPIC_DELETE));
    const client = new LetMeSendEmail("test");
    const result = await client.emailTopics.delete("t1");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Topic deleted");
    restore();
  });
});

// ── Request recording ──

describe("request recording", () => {
  test("records request method, url, headers, and body", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);

    const client = new LetMeSendEmail("test_key");
    await client.emails.send({
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
    });

    expect(mock.requests).toHaveLength(1);
    const req = mock.requests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toMatch(/\/emails$/);
    expect(req.headers.Authorization).toBe("Bearer test_key");
    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.body).toMatchObject({ from: "a@b.com", to: ["c@d.com"] });
    restore();
  });
});

// ── Retries (tested at HttpClient level to avoid instanceof boundary issues) ──

describe("retries", () => {
  test("retries on NetworkError with GET", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);

    const http = new HttpClient({ apiKey: "test", retries: 2 });
    let callCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount <= 2) throw new TypeError("network error");
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await http.request("GET", "/test");
    expect(callCount).toBe(3);
    globalThis.fetch = origFetch;
    restore();
  });

  test("does not retry non-idempotent POST without Idempotency-Key", async () => {
    const mock = mockFetch(500, { name: "server_error", message: "Server error" });
    const restore = installMock(mock);

    const http = new HttpClient({ apiKey: "test", retries: 2 });
    let callCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(JSON.stringify({ name: "server_error", message: "Server error" }), {
        status: 500,
      });
    };

    await expect(http.request("POST", "/test", {})).rejects.toThrow();
    expect(callCount).toBe(1);
    globalThis.fetch = origFetch;
    restore();
  });

  test("retries idempotent POST with Idempotency-Key", async () => {
    const mock = mockFetch(200, SEND_FIXTURE);
    const restore = installMock(mock);

    const http = new HttpClient({ apiKey: "test", retries: 1 });
    let callCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ name: "server_error", message: "Server error" }), {
          status: 500,
        });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await http.request("POST", "/test", {}, { "Idempotency-Key": "my-key" });
    expect(callCount).toBe(2);
    globalThis.fetch = origFetch;
    restore();
  });
});
