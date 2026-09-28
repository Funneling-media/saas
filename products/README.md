# Products

One folder per product. Each has its own plan, code, website and deploy, and (by
default) connects to the shared [`platform/`](../platform/): GoHighLevel, one login,
billing. Products never reach into each other's code; they connect through the
platform. See [`docs/platform.md`](../docs/platform.md).

To start a new one, run `scripts/new-product.sh <product-name> "Display Name"`
(add `--standalone` only for a product that must not connect), then add a row below.

| Product | What it does | Connection | Status |
|---|---|---|---|
| [Podcasting.gg](podcasting-gg/) | Business podcast growth OS: turns 20 strategic interviews into relationships, knowledge and revenue | Connected | Building |
