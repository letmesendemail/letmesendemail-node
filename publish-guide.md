# Publishing — @letmesendemail/letmesendemail-node

## Registry

[npm](https://www.npmjs.com) — `@letmesendemail/letmesendemail-node`

## Prerequisites

- pnpm installed.
- An npm account with access to the `@letmesendemail` org.

## First-Time Setup

```bash
pnpm login
```

## Releasing a Version

```bash
cd sdks/letmesendemail-node

# 1. Update version in package.json

# 2. Build
pnpm build

# 3. Publish (scoped package needs --access public)
pnpm publish --access public
```

## Verifying

```bash
pnpm add @letmesendemail/letmesendemail-node
# or
npm install @letmesendemail/letmesendemail-node
```
