# Podcasting.gg — application code

This folder is the Next.js app. Product overview, plan and docs live one level up:
[`../README.md`](../README.md), [`../PRODUCT.md`](../PRODUCT.md), [`../docs/`](../docs/README.md).

Quick start (details in [`../docs/LOCAL_DEVELOPMENT.md`](../docs/LOCAL_DEVELOPMENT.md)):

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase URL + anon key
pnpm dev                     # http://localhost:3000
pnpm check                   # lint + typecheck + unit tests
pnpm db:local:test           # migrations + RLS tests on a throwaway local Postgres
```
