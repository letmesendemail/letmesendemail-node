# Changelog

## Unreleased

## 0.2.1 — 2026-07-11

- Rewrote retry logic. Sleeps exactly once between attempts. Uses bounded exponential
  backoff with jitter for network errors, timeouts, 408, 500, 502, 503, and 504.
- 429 retries only when Retry-After is valid (delta-seconds or HTTP-date) and within
  the 300-second cap. Rejects missing, invalid, zero, expired, or excessive values
  (throws `RateLimitError` instead of retrying).
- Retries are capped at `MAX_RETRY_DELAY` (300 s). Normal exponential delays are bounded.
- Non-idempotent POST/PUT/PATCH without an `Idempotency-Key` header are never retried.
- Retry count is validated as a non-negative integer (invalid values fall back to 0).
- Malformed 2xx responses (invalid JSON, arrays, non-object types) throw `ApiError`
  preserving the status, headers, and raw body.
- RecordingMock supports queued responses and failures via `thenRespond()`,
  `thenNetworkError()`, and `thenTimeout()`.
- Comprehensive retry tests with fake timers: network errors, timeouts, 408,
  429 delta-seconds, 429 HTTP-date, missing/invalid/excessive Retry-After,
  500/502/503/504, exhaustion, safe methods, unsafe POST, and POST with key.
- Request-recording tests assert method, canonical URL, Authorization, Content-Type,
  Accept, User-Agent, and JSON bodies.
- Attachment tests: path, content, contentId → content_id, contentDisposition →
  content_disposition serialization.
- List/get/update tests for contacts, contact categories, and email topics.
- Error tests: raw body, request ID, response headers, validation errors,
  NetworkError, TimeoutError.
- Version is sourced from the tracked `src/version.ts`, which is regenerated
  from `package.json` by `scripts/prebuild.mjs` before publish. Removed the
  hardcoded version string from client.ts.
- Restored Node 20 in CI matrix (20, 22, 24, 26).

## 0.2.0 — 2026-07-10

- Migrated from bun to pnpm. Added `pnpm-lock.yaml`, removed `bun.lock`, `bun.lock` in `.gitignore`.
- Added CI matrix for Node 22, 24, 26 with pnpm.
- Replaced old test files with consolidated `resources.test.ts` using `RecordingMock`.
- Added request-recording tests that assert method, URL, auth headers, content-type, body.
- Added retry tests: NetworkError retry, non-idempotent POST skip, idempotent POST with key.
- Exported `installMock()` and `mockFetch()` helpers from tests/helpers.ts.
- Fixed `RateLimitError` reference in client.ts that was missing import.
- Removed non-null assertion for Biome compliance.
- Fixed typecheck errors (missing return after retry loop, undefined narrowing).
- Updated test workflow: drop Node 20, add Node 26, remove redundant pnpm version pin.
- Updated User-Agent version string.

## 0.1.0 — 2026-07-09

- Initial release.
- Emails API: send, sendWithTemplate, verify, list, get.
- Domains API: list, get, verify.
- Contacts API: create, list, get, update, delete.
- Contact Categories API: create, list, get, update, delete.
- Email Topics API: create, list, get, update, delete.
- Webhook signature verification.
- Structured error classes.
- Native fetch with configurable timeout and base URL.
