# GoHighLevel connection

**Status:** Planned

GoHighLevel is the central customer record for Funneling Media and Join AI Business.
Every connected product reports to it, so sales, follow-ups and automations work
across all products.

What every connected product should do (once built):
- Find or create the customer's GoHighLevel contact by email when they sign up.
- Add tags for key moments, named `<product>:<event>`, e.g. `podcasting-gg:signed-up`,
  `podcasting-gg:paid`, `podcasting-gg:cancelled`.
- Never keep its own separate copy of a customer's contact details as the "real" version.
  GoHighLevel is the master copy.

The code that talks to GoHighLevel lives here, once, and products use it. Products
never call GoHighLevel their own way.
