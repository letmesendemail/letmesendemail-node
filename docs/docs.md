# letmesend.email Node.js SDK

The official Node.js SDK for the [letmesend.email](https://letmesend.email/) API.

## Overview

This SDK provides a complete, idiomatic TypeScript/JavaScript interface to the
letmesend.email API. It supports sending transactional and broadcast emails,
managing domains, contacts, contact categories, and email topics, verifying
email addresses, and verifying webhook signatures.

All HTTP communication uses the native `fetch` API. Response parsing, error
mapping, retry handling, and pagination are built in.

## Requirements

- Node.js 20 or later

## Installation

```bash
npm install @letmesendemail/letmesendemail-node
# or
pnpm add @letmesendemail/letmesendemail-node
# or
yarn add @letmesendemail/letmesendemail-node
```

## Authentication

The SDK authenticates using a bearer token (API key). Obtain your API key from
the [letmesend.email](https://letmesend.email/) dashboard.

**Recommended:** Set the API key in your environment:

```bash
export LETMESENDEMAIL_API_KEY=lms_live_your_api_key_here
```

```ts
import { LetMeSendEmail } from "@letmesendemail/letmesendemail-node";

const apiKey = process.env.LETMESENDEMAIL_API_KEY;
if (!apiKey) {
  throw new Error("LETMESENDEMAIL_API_KEY is not set");
}

const client = new LetMeSendEmail(apiKey);
```

## Quick Start

```ts
import { LetMeSendEmail, ApiError } from "@letmesendemail/letmesendemail-node";

const apiKey = process.env.LETMESENDEMAIL_API_KEY;
if (!apiKey) {
  throw new Error("LETMESENDEMAIL_API_KEY is not set");
}

const client = new LetMeSendEmail(apiKey);

try {
  const email = await client.emails.send({
    from: "Acme <hello@acme.com>",
    to: ["person@example.com"],
    subject: "Welcome",
    html: "<h1>Welcome!</h1>",
  });
  console.log(email.id, email.status);
} catch (err) {
  if (err instanceof ApiError) {
    console.error("API error:", err.message);
  } else {
    console.error("Error:", err);
  }
}
```

## Client Configuration

### Simple API-Key Client

```ts
const client = new LetMeSendEmail("lms_live_...");
```

### Full Configuration

```ts
const client = new LetMeSendEmail({
  apiKey: "lms_live_...",
  baseUrl: "https://letmesend.email/api/v1",
  timeoutMs: 30_000,
  retries: 3,
});
```

### Configuration Reference

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | Your letmesend.email API key (required) |
| `baseUrl` | `https://letmesend.email/api/v1` | API base URL override |
| `timeoutMs` | `30000` | Request timeout in milliseconds |
| `retries` | `0` | Number of retry attempts for idempotent requests |

### User-Agent

The SDK sends a `User-Agent` header in the format
`@letmesendemail/letmesendemail-node/<version>`. The version is sourced from
`src/version.ts`, which is regenerated from `package.json` before publish.

## Retries

Retries are enabled by setting `retries > 0`.

### Eligibility

| Condition | Retried? |
|-----------|----------|
| GET, HEAD, OPTIONS, DELETE | Yes |
| POST, PUT, PATCH without `Idempotency-Key` | No |
| POST, PUT, PATCH with `Idempotency-Key` | Yes |
| Email/domain verification | No |

### Retryable Failures

- `NetworkError`, `TimeoutError`
- HTTP 408, 429 (with valid Retry-After), 500, 502, 503, 504

### Backoff

- **Network/timeout/5xx:** Bounded exponential backoff with jitter (base 100ms × 2^attempt, uniform random jitter up to 25% of base). Capped at 300 seconds.
- **Rate-limit (429):** Uses the exact `Retry-After` header value (delta-seconds or HTTP-date). No jitter. If `Retry-After` is missing, zero, negative, or exceeds 300 seconds, the error is thrown immediately.

## Idempotency

Set `idempotencyKey` on write requests to enable safe retries:

```ts
const email = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com"],
  subject: "Invoice",
  html: "<p>Invoice attached</p>",
  idempotencyKey: "my-unique-key-abc123",
});

if (email.duplicate) {
  console.log("This was a duplicate send");
}
```

## Emails

All email operations are on `client.emails`.

### Send an Email

```ts
const email = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com", "Jane <jane@example.com>"],
  subject: "Welcome",
  html: "<h1>Welcome!</h1>",
  text: "Welcome!",
  type: "transactional",
  replyTo: ["support@acme.com"],
  cc: ["manager@acme.com"],
  bcc: ["archive@acme.com"],
  headers: { "X-Custom": "value" },
});

console.log(email.id, email.status, email.emails, email.duplicate);
```

**Response fields:** `id`, `status`, `emails`, `restrictedEmails`, `duplicate`.

### Send with a Template

```ts
const email = await client.emails.sendWithTemplate({
  from: "Acme <hello@acme.com>",
  to: ["user@example.com"],
  templateId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  subject: "Hello {{name}}",
  templateVariables: [
    { key: "USER_NAME", type: "string", value: "John" },
  ],
});
```

### Attachments

```ts
const email = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["user@example.com"],
  subject: "With attachment",
  attachments: [
    // By URL
    { name: "report.pdf", path: "https://storage.example.com/report.pdf" },
    // By Base64 content
    { name: "data.txt", content: Buffer.from("file content").toString("base64") },
    // Inline with Content-ID
    { name: "logo.png", content: "aW1hZ2U=", contentId: "logo-cid", contentDisposition: "inline" },
  ],
});
```

**Attachment fields:**

| Field | Description |
|-------|-------------|
| `name` | Filename shown to recipients (required) |
| `path` | Public URL where the file is hosted |
| `content` | Base64-encoded file content |
| `mime` | MIME type (e.g. `application/pdf`) |
| `contentId` | Content-ID for inline embedding |
| `contentDisposition` | `"attachment"` or `"inline"` |

`path` and `content` are mutually exclusive.

### Verify an Email Address

```ts
const result = await client.emails.verify("person@example.com");
console.log(result.status, result.score, result.hasMailbox, result.disposable);
```

### List Emails

```ts
const page = await client.emails.list(20);

for (const item of page.data) {
  console.log(item.id, item.subject, item.status);
}

const pagination = page.pagination;
console.log(pagination.hasMore, pagination.total);

// Next page
if (pagination.hasMore && page.data.length > 0) {
  const lastId = page.data[page.data.length - 1].id;
  const nextPage = await client.emails.list(20, lastId);
}

// Previous page
if (page.data.length > 0) {
  const firstId = page.data[0].id;
  const prevPage = await client.emails.list(20, undefined, firstId);
}
```

**List item fields:** `id`, `status`, `subject`, `eventName`, `type`, `createdAt`, `sentAt`, `recipientsCount`, `attachmentsCount`.

### Get a Single Email

```ts
const detail = await client.emails.get("email_id");

console.log(detail.status, detail.recipientsCount, detail.attachmentsCount);

for (const r of detail.recipients) {
  console.log(r.emailAddress, r.status, r.openCount, r.clickCount);
}

for (const a of detail.attachments) {
  console.log(a.name, a.mime, a.size, a.downloadUrl);
}
```

**Recipient fields:** `type`, `status`, `emailAddress`, `bounceType`, `bounceReason`, `bouncedAt`, `complaintType`, `complainedAt`, `isSuppressed`, `suppressionReason`, `openedAt`, `openCount`, `clickedAt`, `clickCount`, `failedAt`, `errorMessage`, `deliveredAt`, `sentAt`.

**EmailAttachment fields:** `id`, `name`, `mime`, `contentId`, `contentDisposition`, `size`, `downloadUrl`.

## Domains

All domain operations are on `client.domains`.

```ts
// List
const page = await client.domains.list();
for (const d of page.data) {
  console.log(d.domainName, d.status);
}
if (page.pagination.hasMore && page.data.length > 0) {
  const nextPage = await client.domains.list(20, page.data[page.data.length - 1].id);
}

// Get
const domain = await client.domains.get("domain_id");
console.log(domain.domainName, domain.status);

// Verify
const result = await client.domains.verify("example.com");
console.log(result.status);
```

## Contacts

All contact operations are on `client.contacts`.

```ts
// Create
const createdContact = await client.contacts.create({
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  categories: ["cat_id"],
});

// List
const page = await client.contacts.list();
for (const c of page.data) {
  console.log(c.email, c.firstName);
}
if (page.pagination.hasMore && page.data.length > 0) {
  const nextPage = await client.contacts.list(20, page.data[page.data.length - 1].id);
}

// Get
const fetchedContact = await client.contacts.get("contact_id");

// Update
const updated = await client.contacts.update("contact_id", { firstName: "Jane" });

// Delete
const deleted = await client.contacts.delete("contact_id");
console.log(deleted.status);
```

## Contact Categories

All category operations are on `client.contactCategories`.

```ts
// Create
const createdCategory = await client.contactCategories.create("VIP", "vip");
console.log(createdCategory.name, createdCategory.slug);

// List
const page = await client.contactCategories.list();
for (const c of page.data) {
  console.log(c.name, c.slug);
}
if (page.pagination.hasMore && page.data.length > 0) {
  const nextPage = await client.contactCategories.list(20, page.data[page.data.length - 1].id);
}

// Get
const fetchedCategory = await client.contactCategories.get("category_id");

// Update
const updatedCategory = await client.contactCategories.update("category_id", "Premium", "premium");

// Delete
const deleted = await client.contactCategories.delete("category_id");
```

## Email Topics

All topic operations are on `client.emailTopics`.

```ts
// Create
const createdTopic = await client.emailTopics.create({
  name: "Updates",
  slug: "updates",
  description: "Product updates",
  autoSubscribe: true,
});

// List
const page = await client.emailTopics.list();
for (const t of page.data) {
  console.log(t.name, t.description);
}
if (page.pagination.hasMore && page.data.length > 0) {
  const nextPage = await client.emailTopics.list(20, page.data[page.data.length - 1].id);
}

// Get
const fetchedTopic = await client.emailTopics.get("topic_id");

// Update
const updatedTopic = await client.emailTopics.update("topic_id", { name: "Renamed" });

// Delete
const deleted = await client.emailTopics.delete("topic_id");
```

## Pagination

List endpoints return a typed response with `data` (items) and `pagination` (metadata).

```ts
const page = await client.emails.list(20);

for (const item of page.data) {
  console.log(item.id, item.subject);
}

console.log(page.pagination.hasMore, page.pagination.total);

// Next page (safe for empty results)
if (page.pagination.hasMore && page.data.length > 0) {
  const lastId = page.data[page.data.length - 1].id;
  const nextPage = await client.emails.list(20, lastId);
}

// Previous page (safe for empty results)
if (page.data.length > 0) {
  const firstId = page.data[0].id;
  const prevPage = await client.emails.list(20, undefined, firstId);
}
```

**Pagination parameters:**

- `perPage` — items per page (first argument)
- `after` — cursor for the next page (second argument)
- `before` — cursor for the previous page (third argument)

Never pass `after` and `before` together. The API does not support arbitrary page-number jumps. Applications should retain cursor history for Back/Previous navigation.

## Errors and Exceptions

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `ValidationError` | 400, 413, 422 | Request validation failed |
| `AuthenticationError` | 401 | Invalid or missing API key |
| `AuthorizationError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Resource conflict |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ApiError` | 500+ | Server error or malformed response |
| `NetworkError` | — | Connection failed |
| `TimeoutError` | — | Request timed out |
| `WebhookVerificationError` | — | Webhook verification failed |
| `WebhookSigningError` | — | Webhook secret could not be decoded |

### Error Metadata

Every `LetMeSendEmailError` exposes:

- `message` — error description
- `statusCode` — HTTP status
- `apiCode` — API error code
- `requestId` — `x-request-id` header
- `responseHeaders` — response headers
- `rawBody` — raw response body
- `validationErrors` — field-level errors (validation only)

`RateLimitError` additionally exposes `retryAfter`, `limit`, `remaining`, `resetAt`.

### Error Handling

```ts
import {
  ApiError,
  ValidationError,
  RateLimitError,
  NotFoundError,
} from "@letmesendemail/letmesendemail-node";

try {
  await client.emails.send({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.validationErrors);
  } else if (err instanceof RateLimitError) {
    console.log("Retry after", err.retryAfter, "seconds");
  } else if (err instanceof ApiError) {
    console.log(`Error ${err.statusCode}: ${err.message}`);
  } else {
    console.log(err);
  }
}
```

## Webhooks

Webhook signature verification is built into the SDK.

```ts
import {
  LetMeSendEmail,
  WebhookVerificationError,
  WebhookSigningError,
} from "@letmesendemail/letmesendemail-node";

const secret = process.env.LETMESENDEMAIL_WEBHOOK_SECRET;
if (!secret) {
  throw new Error("LETMESENDEMAIL_WEBHOOK_SECRET is not set");
}

function handleWebhook(rawPayload: string, headers: Record<string, string>): void {
  try {
    const payload = LetMeSendEmail.verifyWebhook(rawPayload, headers, secret);
    console.log("Verified:", payload);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("Verification failed:", err.message);
    } else if (err instanceof WebhookSigningError) {
      console.error("Signing error:", err.message);
    } else {
      console.error("Error:", err);
    }
  }
}
```

Call `handleWebhook` with the exact raw request-body string and the request's unmodified webhook headers. Do not parse and re-serialize the body before verification.

### Required Headers

| Header | Description |
|--------|-------------|
| `webhook-id` | Unique webhook message identifier |
| `webhook-log-id` | Log identifier |
| `webhook-timestamp` | Unix timestamp (seconds, ASCII digits only) |
| `webhook-signature` | One or more space-separated `v1,<base64>` signatures |

Headers are matched case-insensitively. The default timestamp tolerance is 300 seconds. Pass a custom `tolerance` as the fifth argument to `verifyWebhook`.

## Model Serialization and Database Storage

All public SDK models are plain JavaScript objects that can be serialized directly with `JSON.stringify()` and parsed back with `JSON.parse()`. Nested models, lists, and pagination metadata are included automatically.

### Standard JSON Serialization

```ts
// Using the authenticated client created in Quick Start:
const email = await client.emails.get("email_abc123");
const json = JSON.stringify(email);
console.log(json);
```

Field names use the SDK's camelCase convention (e.g., `emailAddress`, `createdAt`, `hasMore`).

### Nested Models

Nested objects like recipients, attachments, and pagination metadata are serialized recursively:

```ts
const email = await client.emails.get("email_abc123");
const json = JSON.stringify(email, null, 2);
// recipients: [{ emailAddress: "...", openCount: 1 }, ...]
// attachments: [{ name: "...", size: 1234 }, ...]
```

### Lists and Pagination

List responses include both the `data` array and `pagination` object:

```ts
const page = await client.emails.list(10);
const json = JSON.stringify(page, null, 2);
// data: [{ id: "...", subject: "..." }, ...]
// pagination: { hasMore: true, perPage: 10, total: 100 }
```

### Database Record Preparation

The serialized JSON can be stored in a database or passed to application storage code:

```ts
// Application-owned database function (SDK does not write to databases)
async function saveRecord(table: string, record: Record<string, unknown>): Promise<void> {
  // Application database implementation
}

const email = await client.emails.get("email_abc123");
await saveRecord("emails", email as Record<string, unknown>);
```

For a defensive copy that can be safely mutated:

```ts
const email = await client.emails.get("email_abc123");
const copy = JSON.parse(JSON.stringify(email));
copy.status = "locally-modified";
// Original email.status remains unchanged
```

### Supported Models

All public request and response models are plain objects and support `JSON.stringify()`:

- Request models: `SendEmailRequest`, `SendWithTemplateRequest`, `SendAttachment`, `TemplateVariable`, `CreateContactRequest`, `UpdateContactRequest`, `CreateEmailTopicRequest`, `UpdateEmailTopicRequest`
- Response models: `SendEmailResponse`, `VerifyEmailResponse`, `ShowEmailResponse`, `EmailListItem`, `Recipient`, `EmailAttachment`, `DomainItem`, `ContactItem`, `ContactUpdateResponse`, `StatusResponse`
- List responses: `EmailListResponse`, `DomainListResponse`, `ContactListResponse`, `ContactCategoryListResponse`, `EmailTopicListResponse`
- Nested models: `PaginationInfo`, `ContactCategoryRef`, `ContactCategoryItem`, `EmailTopicItem`

### Important Notes

- Direct model serialization includes a set `idempotencyKey` because it is a
  public request field. When the SDK sends the request, it moves that value to
  the `Idempotency-Key` HTTP header and excludes it from the API request body.
- `undefined` optional fields are omitted from JSON output.
- `null` values are preserved in JSON output.
- Boolean values (`true`/`false`) and numeric values are preserved as their native types.
- Template variable string values serialize as strings; numeric values serialize as numbers.
- Dates are represented as ISO 8601 strings.
- Request attachments (`SendAttachment`) and response attachments (`EmailAttachment`) are distinct types with different available fields.
- API keys, webhook secrets, HTTP clients, and internal SDK state are never included in serialized output.

## Testing

```bash
pnpm install
pnpm test
```

## Runtime Support

| Node.js | Supported |
|---------|-----------|
| 20 | Yes |
| 22 | Yes |
| 24 | Yes |
| 26 | Yes |

## Changelog

See [CHANGELOG.md](../CHANGELOG.md).
