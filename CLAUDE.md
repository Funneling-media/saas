# Funneling Media SaaS repo: rules for Claude

This repo holds many separate products. Keeping them isolated is what lets us add
15-20 more without one breaking another.

## Layout
- `products/<name>/`: one self-contained product each (see `products/_template/`).
- `shared/`: code or branding used by 2+ products. Each subfolder has a README.
- `ideas/`: products not being built yet.
- `docs/`: how we work. `scripts/`: helper commands.

## Rules
- Work inside one product folder per change. Don't touch other products unless asked.
- Never import from another product's folder. Move shared code to `shared/` instead.
- Each product manages its own dependencies inside `products/<name>/app/`.
  No root-level `package.json` or lockfile.
- New product: `scripts/new-product.sh <name> "Display Name"`, then add it to `products/README.md`.
- Names: lowercase, dash-separated (`lead-tracker`), named for what it does.
- Before building a feature, read that product's `PRODUCT.md` and `CLAUDE.md`.
- Never commit secrets or customer data. List setting names in `.env.example` only.
- The owner is non-technical: write READMEs and summaries in plain English.
