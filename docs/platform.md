# One platform, many products

## The idea
Like HubSpot or Zoho, Funneling Media runs many individual products, each with
its own brand and website, on one shared foundation. They serve our existing
customers (Funneling Media and Join AI Business) and new ones, and they all feed
into our GoHighLevel.

## The default rule
**Every new product is connected to the platform, unless it's explicitly said to be a
separate, standalone product that doesn't connect to Funneling Media or Join AI Business.**

If nobody says "standalone", it's connected.

## What "connected" means
- Customers are identified by email and linked to their GoHighLevel contact.
- Key moments (signed up, paid, cancelled, ...) are sent to GoHighLevel as tags.
- It uses the shared pieces in [`platform/`](../platform/) instead of building its own
  login, billing or GoHighLevel connection.
- It's ready for one login across products later, even if that isn't built yet.

## What stays separate, even for connected products
Each product still has its own folder, code, website, domain and deploy. One product
going down or being changed must not break another. They connect **through the
platform**, never by reaching directly into each other's code.

## Standalone products
Marked `**Connection:** Standalone` in their README. They don't use `platform/` and
don't report to GoHighLevel. Create one with `scripts/new-product.sh <name> "Name" --standalone`.
