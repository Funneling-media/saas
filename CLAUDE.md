# Funneling Media SaaS repo: rules for Claude

Funneling Media is building a family of products (Podcasting.gg, BusinessContent.ai,
ConnectMore.net, Closers.team and more) that work like HubSpot or Zoho: separate
products, one connected platform. They serve Funneling Media and Join AI Business
customers plus new ones, and all connect to the company's GoHighLevel.
Full explanation: `docs/platform.md`.

## The default rule (important)
Every new product is **connected** to the platform. Build it standalone ONLY if the
owner explicitly says it's separate and does not connect to Funneling Media or
Join AI Business. If unclear, it's connected.

## Layout
- `products/<name>/`: one product each (see `products/_template/`).
- `platform/`: the shared foundation connected products use: GoHighLevel connection,
  accounts (one login), billing, customer data.
- `shared/`: reusable code or branding that isn't platform infrastructure.
- `ideas/`: products not being built yet. `docs/`: how we work. `scripts/`: helpers.

## Rules
- Connected products use `platform/` for login, billing, customer records and
  GoHighLevel. They never build their own version of these. If a platform piece
  isn't built yet, build it in `platform/` (not inside the product) so the next
  product can reuse it.
- Identify customers by email + GoHighLevel contact ID. GoHighLevel is the master
  customer record. Tag events as `<product>:<event>` (e.g. `podcasting-gg:paid`).
- Products never import from each other's folders. They connect only through `platform/`.
- Each product manages its own dependencies in `products/<name>/app/`.
- Work inside one product per change unless the task is about `platform/` or `shared/`.
- New product: `scripts/new-product.sh <name> "Display Name"` (add `--standalone`
  only when explicitly asked), then add it to `products/README.md`.
- Names: lowercase, dash-separated, named for what the product does.
- Before building a feature, read that product's `PRODUCT.md` and `CLAUDE.md`.
- Never commit secrets or customer data. List setting names in `.env.example` only.
- The owner is non-technical: write READMEs and summaries in plain English.

## Building a product
When the owner shares a build brief or asks to build/continue a product, use the
`build-product` skill (`.claude/skills/build-product/SKILL.md`). It is the standard
way every product here gets built, so all 15-20 come out the same shape.
