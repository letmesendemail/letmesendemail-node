# Changelog

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
- Updated `package.json` version to 0.2.0.
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
