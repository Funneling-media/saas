# Podcasting.gg docs

Living documentation. The repository, not chat history, is the source of truth: when an
implementation decision changes, update the doc in the same change.

| Doc | One line |
|---|---|
| [`../PRODUCT.md`](../PRODUCT.md) | The product plan: problem, promise, customer, V1 21-step loop, milestones, platform connection, pricing status. |
| [`SPEC.md`](SPEC.md) | The founder's original brief, stored unedited. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Layers, folder map, request flow, adapters and provider states, AI flow, background jobs, multi-tenancy, security, mock mode, V2 extension points. |
| [`DATABASE.md`](DATABASE.md) | Schema, enums, RLS helpers, migrations and local database testing. |
| [`AI.md`](AI.md) | Bring-your-own-AI: providers, capability catalog, structured output and retries, context layers, provenance, failure UX, credential storage. |
| [`INTEGRATIONS.md`](INTEGRATIONS.md) | Every integration by capability with its V1 status (real / mock / manual / planned), and exactly what the founder needs to supply. |
| [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md) | Run it on a laptop: prerequisites, env options, demo login, checks, common problems. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Going live on Vercel + Supabase: env vars, migrations, verification, rollback. |
| [`DECISIONS.md`](DECISIONS.md) | Architecture decision log (ADR-001 onward). |
