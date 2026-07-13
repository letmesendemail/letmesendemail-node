# Publishing — @letmesendemail/letmesendemail-node

## Registry

[npm](https://www.npmjs.com) — `@letmesendemail/letmesendemail-node`

Package URL: `https://www.npmjs.com/package/@letmesendemail/letmesendemail-node`

## How Versioning Works

The package version is defined exclusively in `package.json` under the `"version"`
field. A prebuild script (`scripts/prebuild.mjs`) reads it at publish time and
regenerates `src/version.ts` before building, so the bundled SDK always reflects
the correct version. `src/version.ts` is tracked in git but is automatically
updated by the prebuild step; update `package.json` and the prebuild handles
the rest.

**Versioned files:**

- `package.json` — `"version"` field (single source of truth)
- `CHANGELOG.md` — release section

## Maintainer Prerequisites

1. An npm account that is a maintainer of the `@letmesendemail` organization.
2. Two-factor authentication (2FA) enabled on the npm account.
3. (Optional) An npm automation token with publish access for CI workflows,
   stored as a repository secret or environment variable (`NPM_TOKEN`).

## First-Time Setup

```bash
pnpm login
```

This writes an auth token to `~/.npmrc`. For CI, use an npm automation token:

```bash
# .npmrc (project-level, for CI only)
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Ensure the `@letmesendemail` org is created and your account is added.

## Pre-Release Validation

Run all checks from the repository root before tagging:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
npm pack --dry-run
```

Fix any failures before proceeding.

## Releasing a Version

```bash
# 1. Update the version in package.json (single source of truth)
# 2. Move Unreleased entries in CHANGELOG.md to a new version section
# 3. Commit all changes
git add -A
git commit -m "Release vX.Y.Z"

# 4. Tag and push both master and the tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin master vX.Y.Z
```

## Publishing to npm

```bash
# If publishing manually (2FA required):
pnpm publish
# You will be prompted for a one-time password (OTP) from your authenticator app.

# With an automation token (CI, no 2FA prompt):
# The token must have publish permission. Set it as NPM_TOKEN in the CI
# environment and create a project .npmrc that references it.
```

The `prepublishOnly` script runs prebuild (to freshen version.ts) followed by
build automatically.

## Creating a GitHub Release

1. Go to the repository's Releases page.
2. Click "Draft a new release".
3. Select the existing tag (`vX.Y.Z`).
4. Add release notes summarizing changes from CHANGELOG.md.
5. Mark it as the latest release and publish.

## Verifying

```bash
npm install @letmesendemail/letmesendemail-node
# or
pnpm add @letmesendemail/letmesendemail-node
```

Then check that the installed version matches the released tag.

## Recovering a Broken Release

- **npm does not support overwriting published versions.** Publish a patch release
  with the fix instead.
- If a version contains sensitive data that must be removed, use
  `npm deprecate` to warn users:
  ```bash
  npm deprecate @letmesendemail/letmesendemail-node@"<version>" "Critical issue — upgrade to <fixed-version>"
  ```
- For severe security issues, contact npm support to request an unpublish
  (only possible within 72 hours of release under npm's policy).
