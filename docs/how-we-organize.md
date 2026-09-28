# How we organize our software

A plain-English guide to keeping Funneling Media's GitHub tidy.

## The big picture

- **Organization** (`Funneling-media`): the company's space on GitHub. Everything we build lives here, not in personal accounts.
- **Repository ("repo")**: a project folder with its full history. This `saas` repo is the hub for all our SaaS products.
- **Product folder**: each product gets its own folder inside [`products/`](../products/).

If a product grows big enough (its own team, its own releases), it can move into
its own repo named `saas-<product>` (e.g. `saas-lead-tracker`). Until then, keep it here.

## Naming rules

- Lowercase, words separated by dashes: `lead-tracker`, `email-scheduler`.
- Name things for what they do, not code names.
- Every product folder starts with a `README.md` saying what it is and its status.

## Product status

Each product README has a **Status** line. Use one of:

| Status | Meaning |
|---|---|
| Idea | Written down, not started. (Lives in `ideas/`.) |
| Building | Being built, not used by customers yet. |
| Live | Customers are using it. |
| Paused | On hold. |
| Retired | No longer used. Kept for reference. |

## Where things go

| If it's... | Put it in... |
|---|---|
| A new product idea | `ideas/<idea-name>.md` (or open a "New product idea" issue) |
| A product we're building | `products/<product-name>/` |
| A logo, color palette or font | `shared/branding/` |
| Code used by more than one product | `shared/` |
| A bug or feature request | The **Issues** tab |

## Never put in GitHub

- Passwords, API keys, or other secrets.
- Customer personal data.

These belong in a password manager or the hosting provider's settings, never in files here.
