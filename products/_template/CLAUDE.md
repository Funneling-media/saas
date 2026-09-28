# Working on this product

- This product is self-contained. Only change files inside this folder unless
  the task is explicitly about `shared/` or the repo-wide docs.
- Never import code from another product's folder. If two products need the
  same code, move it into `shared/` with its own README.
- Read `PRODUCT.md` before building a feature; if a request contradicts it,
  update `PRODUCT.md` in the same change so the plan stays true.
- Code lives in `app/`. Its dependencies are installed there, not at the repo root.
- Secrets go in `app/.env` (never committed). List every new setting's name in `.env.example`.
- Keep the Status line in `README.md` and the row in `products/README.md` current.
