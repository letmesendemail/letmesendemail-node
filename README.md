# letmesend.email Node.js SDK
[![npm Downloads](https://img.shields.io/npm/dm/@letmesendemail/letmesendemail-node?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@letmesendemail/letmesendemail-node)
[![npm Version](https://img.shields.io/npm/v/@letmesendemail/letmesendemail-node?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/@letmesendemail/letmesendemail-node)
[![License](https://img.shields.io/github/license/letmesendemail/letmesendemail-node?color=9cf&style=for-the-badge&labelColor=000000&cache=v1)](LICENSE.md)

The official Node.js SDK for the [letmesend.email](https://letmesend.email/) API.

## Installation

```bash
npm install @letmesendemail/letmesendemail-node
# or
pnpm add @letmesendemail/letmesendemail-node
# or
yarn add @letmesendemail/letmesendemail-node
```

## Quick Start

```ts
import { LetMeSendEmail } from "@letmesendemail/letmesendemail-node";

const client = new LetMeSendEmail(process.env.LETMESENDEMAIL_API_KEY!);

const email = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com"],
  subject: "Welcome",
  html: "<p>Hello from letmesend.email</p>",
});

console.log(email.id); // "01kvv5a6xk9qd6y2egeae8w76e"
```

## Configuration

```ts
// With API key string
const client = new LetMeSendEmail("lms_live_...");

// With full config object
const client = new LetMeSendEmail({
  apiKey: "lms_live_...",
  baseUrl: "https://letmesend.email/api/v1",
  timeoutMs: 30_000,
  retries: 0,
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | Your letmesend.email API key |
| `baseUrl` | `https://letmesend.email/api/v1` | API base URL override |
| `timeoutMs` | `30000` | Request timeout in milliseconds |
| `retries` | `0` | Number of retry attempts |

### Retry Semantics

Retries happen only for idempotent operations:
- **GET, HEAD, OPTIONS, DELETE** are always retryable.
- **POST, PUT, PATCH** are retryable only when an `Idempotency-Key` header is present.

**What is retried:**
- `NetworkError` and `TimeoutError` — connection or timeout failures.
- HTTP 408, 500, 502, 503, 504 — retryable server errors.

**Rate-limit (429) retries:**
- Retried only when a valid `Retry-After` header is present (delta-seconds or HTTP-date).
- The delay respects the server-provided value without jitter (never retries earlier than requested).
- If `Retry-After` is missing, invalid, zero, expired, or exceeds 300 seconds, the error is thrown immediately.

**Backoff:**
- Non-rate-limit retries use bounded exponential backoff with jitter (base 100ms × 2^attempt).
- All delays are capped at 300 seconds.

## Emails

```ts
// Send
const email = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com"],
  subject: "Welcome",
  html: "<h1>Welcome!</h1>",
  type: "transactional",
  idempotencyKey: "my-unique-key",
});

console.log(email.id, email.status, email.duplicate);

// With attachments
const email2 = await client.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com"],
  subject: "Report",
  attachments: [
    // By URL
    { name: "report.pdf", path: "https://example.com/report.pdf" },
    // By inline content (base64)
    { name: "data.txt", content: "SGVsbG8=" },
    // With content ID for embedded images
    { name: "logo.png", content: "aW1hZ2U=", contentId: "logo-cid", contentDisposition: "inline" },
  ],
});

// Send with template
const email3 = await client.emails.sendWithTemplate({
  from: "Acme <hello@acme.com>",
  to: ["person@example.com"],
  templateId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  templateVariables: [
    { key: "USER_NAME", type: "string", value: "John" },
  ],
});

// Verify an email address
const result = await client.emails.verify("person@example.com");
console.log(result.status, result.score, result.hasMailbox);

// List emails
const list = await client.emails.list(20);
for (const item of list.data) {
  console.log(item.id, item.subject);
}
console.log(list.pagination.hasMore);

// Get a single email
const detail = await client.emails.get("01kvv5dv472evp42a60sy4p7zx");
console.log(detail.status, detail.recipientsCount);
```

## Domains

```ts
const list = await client.domains.list();
const domain = await client.domains.get("id");
const result = await client.domains.verify("example.com");
```

## Contacts

```ts
const contact = await client.contacts.create({
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
});

const list = await client.contacts.list();
const item = await client.contacts.get("id");
const updated = await client.contacts.update("id", { firstName: "Jane" });
const deleted = await client.contacts.delete("id");
```

## Contact Categories

```ts
const cat = await client.contactCategories.create("New Name", "new-name");
const list = await client.contactCategories.list();
const item = await client.contactCategories.get("id");
const updated = await client.contactCategories.update("id", "Updated");
const deleted = await client.contactCategories.delete("id");
```

## Email Topics

```ts
const topic = await client.emailTopics.create({
  name: "Product Updates",
  slug: "product-updates",
  description: "Emails about new features",
});

const list = await client.emailTopics.list();
const item = await client.emailTopics.get("id");
const updated = await client.emailTopics.update("id", { name: "Updated" });
const deleted = await client.emailTopics.delete("id");
```

## Webhooks

```ts
import { LetMeSendEmail } from "@letmesendemail/letmesendemail-node";

const rawPayload = JSON.stringify({
  event: "email.delivered",
  data: { id: "email_123" },
});

const headers: Record<string, string> = {
  "webhook-id": "msg_123",
  "webhook-log-id": "log_456",
  "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
  "webhook-signature": "v1,<base64_hmac_sha256>",
};

try {
  const event = LetMeSendEmail.verifyWebhook(rawPayload, headers, process.env.LETMESENDEMAIL_WEBHOOK_SECRET!);
  console.log("Verified event:", event.event);
} catch (err) {
  console.error("Verification failed:", err);
}
```

## Pagination

List endpoints return `data` and `pagination`:

```ts
const list = await client.emails.list(10, "cursor_after", "cursor_before");
console.log(list.pagination.hasMore);
console.log(list.pagination.total);
```

## Error Handling

```ts
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  ApiError,
  NetworkError,
} from "@letmesendemail/letmesendemail-node";

try {
  await client.emails.send({ /* ... */ });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.validationErrors); // field-level errors
  } else if (err instanceof AuthenticationError) {
    console.log("Check your API key");
  } else if (err instanceof RateLimitError) {
    console.log("Retry after", err.retryAfter, "seconds");
  } else if (err instanceof NetworkError) {
    console.log("Network issue:", err.message);
  } else if (err instanceof ApiError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  }
}
```

## Version Support

| Node.js | Supported |
|---------|-----------|
| 20 | Yes |
| 22 | Yes |
| 24 | Yes |
| 26 | Yes |

## Testing

```bash
pnpm install
pnpm test
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
