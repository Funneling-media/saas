# Platform: what connects all our products

Think HubSpot or Zoho: many separate products (Podcasting.gg, BusinessContent.ai,
ConnectMore.net, Closers.team, ...), each with its own name and website, all sitting
on **one shared foundation**. A customer who buys one product is already known to
the others.

That foundation lives here. Every product is **connected by default**. It is only
built standalone when that's explicitly decided (see `docs/platform.md`).

| Piece | What it does | Status |
|---|---|---|
| [`gohighlevel/`](gohighlevel/) | Links every product to our GoHighLevel: one customer record, tags, pipelines, automations. | Planned |
| [`accounts/`](accounts/) | One login that works across all our products. | Planned |
| [`billing/`](billing/) | Plans, payments and bundles across products. | Planned |
| [`customer-data/`](customer-data/) | The shared list of what each customer has, uses and pays for. | Planned |

"Planned" means the space is reserved and the rules are written, but it isn't built
yet. Each piece gets built the first time a product actually needs it, then every
later product reuses it.
