# Working on this product

- This product is self-contained. Only change files inside this folder unless
  the task is explicitly about `shared/` or the repo-wide docs.
- Check the **Connection** line in `README.md`. If connected (the default), use
  `platform/` for login, billing, customer records and GoHighLevel. Never build
  those inside this product. See `docs/platform.md`.
- Never import code from another product's folder. Products connect only through
  `platform/`; other reusable code goes in `shared/`.
- Read `PRODUCT.md` before building a feature; if a request contradicts it,
  update `PRODUCT.md` in the same change so the plan stays true.
- Code lives in `app/`. Its dependencies are installed there, not at the repo root.
- Secrets go in `app/.env` (never committed). List every new setting's name in `.env.example`.
- Keep the Status line in `README.md` and the row in `products/README.md` current.
