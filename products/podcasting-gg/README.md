# Podcasting.gg

**Status:** Building (local V1; not deployed yet)
**Folder:** `products/podcasting-gg/`
**Connection:** Connected to the Funneling Media platform (GoHighLevel)
**Domain:** podcasting.gg

## What it does
Podcasting.gg is a growth operating system for business podcasts. It helps an
entrepreneur turn 20 strategic conversations into a business network, authority,
reusable content, opportunities and revenue. It plans the podcast, finds and researches
guests, drafts outreach, prepares interviews, turns each recorded conversation into
show notes, content and quotes, detects business opportunities hidden in the
transcript ("you should meet my partner", "we're hiring"), keeps the relationships warm,
tracks publishing, and makes every conversation searchable forever (Podcast Brain).
Its home screen answers one question every morning: what should I do today to make my
podcast produce business?

It does not record, edit or host audio. It connects to tools that do (Riverside,
Descript, Transistor, YouTube, etc.) and, in V1, lets you do those steps manually.
Customers bring their own AI key (OpenAI, Anthropic, Gemini, and others). There is no
billing or credit system in V1.

## Who it's for
Consultants, coaches, agency owners, founders, advisors and high-ticket service
businesses who podcast for relationships and clients, not for download counts. Used
day to day by the host and a small team; later also by Funneling Media staff delivering
managed services.

## Where it lives
- Live website: not yet (planned: Vercel for the app, Supabase for database/login/files)
- Hosting / accounts used: Supabase project (to be created), Vercel project (to be
  created), GitHub repo (this one), Funneling Media's GoHighLevel agency account
- Runs fully on a laptop today with mock integrations; see `docs/LOCAL_DEVELOPMENT.md`

## What's in this folder
| File / folder | What it is |
|---|---|
| `README.md` | This page: the quick summary. |
| `PRODUCT.md` | The living product plan: promise, customer, V1 checklist (21-step loop), milestones, platform connection, pricing status. |
| `CLAUDE.md` | Rules Claude follows when working on this product. |
| `app/` | The product's code (Next.js + Supabase). Nothing outside this folder depends on it. |
| `app/.env.example` | Names of the settings/keys the app needs (never the real values). |
| `docs/` | Living documentation (table below). |

### `docs/`
| Doc | What it answers |
|---|---|
| [`docs/README.md`](docs/README.md) | Index of all docs. |
| [`docs/SPEC.md`](docs/SPEC.md) | The founder's original brief, unedited. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the app is built: layers, folders, adapters, AI flow, jobs, tenancy, security, mock mode. |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Tables, enums, RLS and migrations. |
| [`docs/AI.md`](docs/AI.md) | Bring-your-own-AI: providers, capabilities, structured output, safety rules. |
| [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) | Every integration, its V1 status (real/mock/manual/planned), and what the founder must supply. |
| [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) | How to run it on a laptop, demo login, tests. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | How it will go live on Vercel + Supabase. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Log of the big technical decisions and why. |

## Notes
- Tech stack: Next.js 16, React 19, TypeScript, Tailwind v4, Supabase (Postgres, Auth,
  Storage), pnpm. Decided in `docs/DECISIONS.md` ADR-001.
- Demo login for local use: `demo@podcasting.gg` / `demo1234` (seed data only).
- Next steps: finish the V1 core loop milestone by milestone (see `PRODUCT.md`), keep
  every integration honestly labeled real / mock / manual / planned, then deploy per
  `docs/DEPLOYMENT.md`. Credentials the founder still needs to supply are listed at the
  bottom of `docs/INTEGRATIONS.md`.
- Keep the Status line above and the row in `products/README.md` current.
