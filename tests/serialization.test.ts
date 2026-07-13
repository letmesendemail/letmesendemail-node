import { describe, expect, it } from "vitest";
import type {
  ContactCategoryItem,
  ContactCategoryListResponse,
  ContactItem,
  ContactListResponse,
  DomainItem,
  DomainListResponse,
  EmailListItem,
  EmailListResponse,
  EmailTopicItem,
  EmailTopicListResponse,
  PaginationInfo,
  SendAttachment,
  SendEmailRequest,
  SendEmailResponse,
  SendWithTemplateRequest,
  ShowEmailResponse,
  StatusResponse,
  TemplateVariable,
  VerifyEmailResponse,
} from "../src/types.js";

describe("model serialization", () => {
  // ── SendEmailRequest ──
  it("serializes SendEmailRequest", () => {
    const req: SendEmailRequest = {
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
      html: "<p>Hello</p>",
      idempotencyKey: "idem_123",
    };
    const json = JSON.stringify(req);
    const parsed = JSON.parse(json);
    expect(parsed.from).toBe("a@b.com");
    expect(parsed.subject).toBe("Hi");
    expect(parsed.idempotencyKey).toBe("idem_123");
  });

  // ── SendWithTemplateRequest ──
  it("serializes SendWithTemplateRequest", () => {
    const req: SendWithTemplateRequest = {
      from: "a@b.com",
      to: ["c@d.com"],
      templateId: "t1",
      templateVariables: [
        { key: "NAME", type: "string", value: "John" },
        { key: "COUNT", type: "number", value: 42 },
      ],
      idempotencyKey: "idem_456",
    };
    const json = JSON.stringify(req);
    const parsed = JSON.parse(json);
    expect(parsed.templateId).toBe("t1");
    expect(parsed.templateVariables).toHaveLength(2);
    expect(parsed.templateVariables[0].value).toBe("John");
    expect(parsed.templateVariables[1].value).toBe(42);
    expect(parsed.idempotencyKey).toBe("idem_456");
  });

  // ── SendAttachment ──
  it("serializes SendAttachment", () => {
    const att: SendAttachment = {
      name: "doc.pdf",
      mime: "application/pdf",
      content: "base64data",
      contentDisposition: "attachment",
    };
    const json = JSON.stringify(att);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("doc.pdf");
    expect(parsed.mime).toBe("application/pdf");
    expect(parsed.contentDisposition).toBe("attachment");
  });

  // ── TemplateVariable ──
  it("serializes TemplateVariable with string value", () => {
    const tv: TemplateVariable = { key: "USER_NAME", type: "string", value: "John" };
    const parsed = JSON.parse(JSON.stringify(tv));
    expect(parsed.value).toBe("John");
    expect(parsed.type).toBe("string");
  });

  it("serializes TemplateVariable with number value", () => {
    const tv: TemplateVariable = { key: "COUNT", type: "number", value: 42 };
    const parsed = JSON.parse(JSON.stringify(tv));
    expect(parsed.value).toBe(42);
    expect(typeof parsed.value).toBe("number");
  });

  // ── SendEmailResponse ──
  it("serializes SendEmailResponse", () => {
    const resp: SendEmailResponse = {
      id: "e1",
      status: "accepted",
      emails: ["j@e.com"],
      restrictedEmails: [],
      duplicate: false,
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.id).toBe("e1");
    expect(parsed.duplicate).toBe(false);
    expect(parsed.emails).toEqual(["j@e.com"]);
  });

  // ── VerifyEmailResponse ──
  it("serializes VerifyEmailResponse", () => {
    const resp: VerifyEmailResponse = {
      email: "j@e.com",
      score: 85,
      status: "valid",
      domainExists: true,
      disposable: false,
      roleBased: false,
      hasMailbox: true,
      receiveEmail: true,
      mxRecords: true,
      validSyntax: true,
      belongsTo: null,
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.score).toBe(85);
    expect(parsed.belongsTo).toBeNull();
  });

  // ── EmailListItem ──
  it("serializes EmailListItem", () => {
    const item: EmailListItem = {
      id: "e1",
      status: "sent",
      subject: "Hello",
      eventName: null,
      type: "transactional",
      createdAt: "2026-01-01T00:00:00Z",
      sentAt: null,
      recipientsCount: 1,
      attachmentsCount: 0,
    };
    const parsed = JSON.parse(JSON.stringify(item));
    expect(parsed.id).toBe("e1");
    expect(parsed.recipientsCount).toBe(1);
    expect(parsed.sentAt).toBeNull();
  });

  // ── EmailListResponse ──
  it("serializes EmailListResponse with pagination", () => {
    const resp: EmailListResponse = {
      data: [
        {
          id: "e1",
          status: "sent",
          subject: "Hi",
          eventName: null,
          type: "tx",
          createdAt: "2026-01-01T00:00:00Z",
          sentAt: null,
          recipientsCount: 1,
          attachmentsCount: 0,
        },
      ],
      pagination: { hasMore: false, perPage: 10, fetched: 1, total: 1 },
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.data).toHaveLength(1);
    expect(parsed.pagination.hasMore).toBe(false);
    expect(parsed.pagination.total).toBe(1);
  });

  // ── ShowEmailResponse with nested recipients and attachments ──
  it("serializes ShowEmailResponse with nested models", () => {
    const resp: ShowEmailResponse = {
      id: "e1",
      status: "sent",
      subject: "Test",
      eventName: null,
      type: "tx",
      createdAt: "2026-01-01T00:00:00Z",
      sentAt: null,
      recipientsCount: 1,
      attachmentsCount: 1,
      recipients: [
        {
          type: "to",
          status: "sent",
          emailAddress: "u@e.com",
          bounceType: null,
          bounceReason: null,
          bouncedAt: null,
          complaintType: null,
          complainedAt: null,
          isSuppressed: false,
          suppressionReason: null,
          openedAt: null,
          openCount: 1,
          clickedAt: null,
          clickCount: 0,
          failedAt: null,
          errorMessage: null,
          deliveredAt: null,
          sentAt: null,
        },
      ],
      attachments: [
        {
          id: "a1",
          name: "doc.pdf",
          mime: "application/pdf",
          contentId: "",
          contentDisposition: "attachment",
          size: 1234,
          downloadUrl: "https://...",
        },
      ],
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.recipients).toHaveLength(1);
    expect(parsed.recipients[0].emailAddress).toBe("u@e.com");
    expect(parsed.recipients[0].openCount).toBe(1);
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0].size).toBe(1234);
  });

  // ── PaginationInfo ──
  it("serializes PaginationInfo", () => {
    const p: PaginationInfo = { hasMore: true, perPage: 20, fetched: 5, total: 100 };
    const parsed = JSON.parse(JSON.stringify(p));
    expect(parsed.hasMore).toBe(true);
    expect(parsed.perPage).toBe(20);
    expect(parsed.total).toBe(100);
  });

  // ── DomainItem ──
  it("serializes DomainItem", () => {
    const d: DomainItem = {
      id: "d1",
      domainName: "example.com",
      status: "verified",
      createdAt: "2026-01-01T00:00:00Z",
    };
    const parsed = JSON.parse(JSON.stringify(d));
    expect(parsed.domainName).toBe("example.com");
  });

  // ── DomainListResponse ──
  it("serializes DomainListResponse", () => {
    const resp: DomainListResponse = {
      data: [
        {
          id: "d1",
          domainName: "example.com",
          status: "verified",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      pagination: { hasMore: false, perPage: 20, fetched: 1, total: 1 },
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.data).toHaveLength(1);
    expect(parsed.pagination.hasMore).toBe(false);
  });

  // ── ContactItem with nested categories ──
  it("serializes ContactItem with nested categories", () => {
    const c: ContactItem = {
      id: "c1",
      email: "j@e.com",
      firstName: "John",
      lastName: null,
      phone: null,
      isGloballyUnsubscribed: false,
      createdAt: "2026-01-01T00:00:00Z",
      categories: [{ id: "cat1", name: "VIP", slug: "vip" }],
    };
    const parsed = JSON.parse(JSON.stringify(c));
    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0].name).toBe("VIP");
  });

  // ── ContactListResponse ──
  it("serializes ContactListResponse", () => {
    const resp: ContactListResponse = {
      data: [
        {
          id: "c1",
          email: "j@e.com",
          firstName: null,
          lastName: null,
          phone: null,
          isGloballyUnsubscribed: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      pagination: { hasMore: false, perPage: 20, fetched: 1, total: 1 },
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.data).toHaveLength(1);
  });

  // ── ContactCategoryItem ──
  it("serializes ContactCategoryItem", () => {
    const item: ContactCategoryItem = { id: "cat1", name: "VIP", slug: "vip" };
    const parsed = JSON.parse(JSON.stringify(item));
    expect(parsed.slug).toBe("vip");
  });

  // ── ContactCategoryListResponse ──
  it("serializes ContactCategoryListResponse", () => {
    const resp: ContactCategoryListResponse = {
      data: [{ id: "cat1", name: "VIP", slug: "vip" }],
      pagination: { hasMore: false, perPage: 20, fetched: 1, total: 1 },
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.data).toHaveLength(1);
  });

  // ── EmailTopicItem ──
  it("serializes EmailTopicItem", () => {
    const item: EmailTopicItem = {
      id: "t1",
      name: "Updates",
      slug: "updates",
      description: "Product updates",
      autoSubscribe: true,
      public: false,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const parsed = JSON.parse(JSON.stringify(item));
    expect(parsed.name).toBe("Updates");
    expect(parsed.autoSubscribe).toBe(true);
  });

  // ── EmailTopicListResponse ──
  it("serializes EmailTopicListResponse", () => {
    const resp: EmailTopicListResponse = {
      data: [
        {
          id: "t1",
          name: "Updates",
          slug: "updates",
          description: null,
          autoSubscribe: true,
          public: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      pagination: { hasMore: false, perPage: 20, fetched: 1, total: 1 },
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.data).toHaveLength(1);
  });

  // ── StatusResponse ──
  it("serializes StatusResponse", () => {
    const s: StatusResponse = { status: "deleted", message: "Ok" };
    const parsed = JSON.parse(JSON.stringify(s));
    expect(parsed.status).toBe("deleted");
    expect(parsed.message).toBe("Ok");
  });

  it("serializes StatusResponse without optional message", () => {
    const s: StatusResponse = { status: "deleted" };
    const parsed = JSON.parse(JSON.stringify(s));
    expect(parsed.status).toBe("deleted");
    expect(parsed.message).toBeUndefined();
  });

  // ── Defensive copy ──
  it("JSON.parse(JSON.stringify()) creates a defensive copy", () => {
    const resp: SendEmailResponse = {
      id: "e1",
      status: "sent",
      emails: [],
      restrictedEmails: [],
      duplicate: false,
    };
    const copy = JSON.parse(JSON.stringify(resp));
    copy.id = "modified";
    expect(resp.id).toBe("e1");
  });

  // ── Optional fields ──
  it("omits undefined optional fields from JSON", () => {
    const req: SendEmailRequest = {
      from: "a@b.com",
      to: ["c@d.com"],
      subject: "Hi",
    };
    const json = JSON.stringify(req);
    expect(json).not.toContain("html");
    expect(json).not.toContain("text");
    expect(json).not.toContain("idempotencyKey");
  });

  // ── Null values ──
  it("preserves null values in JSON", () => {
    const item: EmailListItem = {
      id: "e1",
      status: "sent",
      subject: null,
      eventName: null,
      type: "tx",
      createdAt: "2026-01-01T00:00:00Z",
      sentAt: null,
      recipientsCount: 0,
      attachmentsCount: 0,
    };
    const json = JSON.stringify(item);
    const parsed = JSON.parse(json);
    expect(parsed.subject).toBeNull();
  });

  // ── Booleans ──
  it("preserves boolean values", () => {
    const resp: SendEmailResponse = {
      id: "e1",
      status: "sent",
      emails: [],
      restrictedEmails: [],
      duplicate: true,
    };
    const parsed = JSON.parse(JSON.stringify(resp));
    expect(parsed.duplicate).toBe(true);
    expect(typeof parsed.duplicate).toBe("boolean");
  });

  // ── Numbers ──
  it("preserves numeric values", () => {
    const info: PaginationInfo = { hasMore: true, perPage: 25, fetched: 10, total: 1000 };
    const parsed = JSON.parse(JSON.stringify(info));
    expect(parsed.perPage).toBe(25);
    expect(typeof parsed.perPage).toBe("number");
  });

  // ── JSON.stringify compatibility ──
  it("JSON.stringify produces valid JSON for all model types", () => {
    const models = [
      { from: "a@b.com", to: [], subject: "" } as SendEmailRequest,
      { id: "e1", status: "sent", emails: [], restrictedEmails: [] } as SendEmailResponse,
      { id: "d1", domainName: "ex.com", status: "verified", createdAt: "" } as DomainItem,
      { status: "ok" } as StatusResponse,
    ];
    for (const model of models) {
      const json = JSON.stringify(model);
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});
