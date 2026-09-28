# Product plan: Podcasting.gg

> The single source of truth for what we're building. Update it when a decision changes.
> Consequential technical choices are logged in [`docs/DECISIONS.md`](docs/DECISIONS.md).

**Category:** Business Podcast Growth Operating System.
**Not:** podcast hosting, recording software, an audio editor, an AI show-note generator, a
podcast directory, a generic CRM or a generic social scheduler. Those connect to it; they
are not the product.

## The problem
Consultants, coaches, agency owners, founders and advisors start podcasts to grow their
business, then treat them like a media hobby: they chase downloads, spend hours on
production, and lose track of the thing that actually pays off, the relationships and
business openings that come out of each conversation. Guests are forgotten after the
episode airs, promises made on air are never followed up, and the knowledge inside 20
hours of expert conversation sits in unsearchable audio files. Existing podcast tools
solve recording, editing and hosting. None of them answer: "What happened because I had
this conversation, and what should I do next?"

## The promise
"My podcast became a business network and authority engine: every episode I record turns
into relationships, content, opportunities and revenue, and the software tells me what
to do next."

Public promise: **Become a Top 1% Podcaster in 20 Episodes.** Not 20 uploads: 20
strategically completed conversations that each strengthen the network, knowledge base,
authority and opportunity graph.

## Customer
- **Who buys it:** high-value expertise businesses: consultants, coaches, agency owners,
  founders, advisors, high-ticket service providers. They care about relationships and
  outcomes more than CPMs and entertainment-scale downloads. Not hobby podcasters.
- **Who uses it day to day:** the founder/host, plus a small team (assistant, producer,
  marketer) as organization members. Later, Funneling Media's own fulfillment staff for
  managed-service customers (internal roles, kept separate from customer permissions).

## Product constitution (every decision follows these)
1. **Business first.** Features must create authority, relationships, distribution,
   opportunities or revenue.
2. **Orchestrate, don't rebuild.** Riverside, hosting, Descript, email, GoHighLevel,
   YouTube, social publishers, AI models are integrated, never rebuilt. We own the
   workflow and intelligence layer.
3. **AI as an operating layer.** AI researches, recommends, summarizes, extracts, drafts,
   classifies, detects opportunities. Humans approve consequential external actions.
4. **Outcomes over activity.** Measure relationships, introductions, meetings,
   opportunities, clients and revenue influenced, not just downloads.
5. **Modular by design.** Every external provider is replaceable through an adapter.
6. **Action over dashboard porn.** The home screen answers "What should I do next?"

## Two operating modes
- **Host Mode:** run your own podcast. Strategy → dream guests → research → outreach →
  booking → interview prep → record (externally) → transcript → content → approval →
  publish → repurpose → distribute → follow up → relationships → opportunities → impact.
- **Guest Mode:** get booked on other people's podcasts. Guest positioning → guest
  profile → find relevant shows → research show/host → score fit → personalized pitch →
  track outreach, replies and bookings → prepare → capture published appearance →
  follow up → track resulting opportunities.

Both modes share contacts, relationships, tasks, knowledge and analytics.

## The 20-episode system (visible product mechanic)
Progress shows as "Episode 7 / 20", but an episode only counts when its workflow
requirements are met (recorded, transcript stored, title and show notes complete,
published/distribution recorded, guest follow-up done). The rules live in domain config
(`app/src/domain`), not in UI components, so they can be tuned without touching screens.

| # | Milestone | Roughly means |
|---|---|---|
| 1 | **Launch** | Strategy set, brand kit started, podcast live, first episode(s) completed. |
| 2 | **Consistent** | Publishing on the stated cadence for a sustained run of episodes. |
| 3 | **Authority** | Content is being repurposed and distributed; knowledge base is growing. |
| 4 | **Network Builder** | Relationships nurtured, follow-ups completed, introductions and opportunities logged. |
| 5 | **Top 1%** | 20 strategically completed episodes with measured business outcomes. |

Each milestone has transparent inputs. We never show a score whose inputs a user can't see.

## Version 1 (the core loop; smallest thing worth charging for)
The 21-step loop from the brief. V1 is done when a founder can do all of this locally,
with mock integrations, and without buying any enterprise API.

- [ ] 1. User signs up (email + password via Supabase Auth)
- [ ] 2. Creates organization and workspace
- [ ] 3. Completes founder / business / podcast onboarding (feels like hiring a strategist, not filling in settings)
- [ ] 4. Gets an editable Podcast Strategy (AI-drafted if a provider is connected; never blocks onboarding)
- [ ] 5. Adds / discovers guests (guest CRM + pipeline, list and kanban views)
- [ ] 6. Researches a guest (manual URLs/notes always; AI research brief when connected; sourced facts kept separate from AI suggestions)
- [ ] 7. Generates outreach (AI draft, approval required before anything is sent; email + manual LinkedIn + reminders)
- [ ] 8. Tracks the booking (guest moves through the pipeline; booking record)
- [ ] 9. Generates an interview brief (editable, non-generic questions)
- [ ] 10. Creates / records the episode externally (recording URL + media metadata; no built-in recorder)
- [ ] 11. Imports / pastes the transcript (transcript is a first-class object with segments, speakers, language)
- [ ] 12. AI analyzes the transcript (background job; queued/processing/complete/failed states)
- [ ] 13. Show notes, content ideas and quotes are generated into the Content Library (editable, provenance tracked)
- [ ] 14. Opportunity Engine detects business opportunities with supporting excerpts and confidence
- [ ] 15. User accepts / dismisses / edits opportunities or converts them to tasks
- [ ] 16. Relationship CRM updates (interactions, next follow-up, relationship strength, introductions)
- [ ] 17. Publishing workflow is tracked (destinations with status; manual/mock publishing in V1)
- [ ] 18. Guest sharing kit and follow-up happen (thank-you, links, clips, captions)
- [ ] 19. Mission Control surfaces today's next best actions (tasks, approvals, follow-ups, opportunities)
- [ ] 20. Podcast Brain makes accumulated knowledge searchable (lexical search + structured extraction first; citations back to episodes)
- [ ] 21. User progresses toward 20 strategically completed episodes (milestones above)

Also in V1: Brand Kit, tasks, approval center foundation, basic Guest Mode, global
search / command palette, integrations settings with real/mock/manual/planned labels,
AI provider settings (bring your own key), demo data, responsive UI, local development.

## Later (not in version 1)
- Credits or usage metering, subscriptions, Stripe, plans and entitlements (via `platform/billing`)
- Built-in hosting, built-in recording, video editing
- Automatic multichannel publishing (YouTube, Spotify, Blotato, etc. move from planned/manual to real)
- Deeper Riverside, Transistor, Descript integrations; automatic transcription providers
- Semantic (embedding) search in Podcast Brain, anti-repetition engine
- Host/guest marketplace, sponsor marketplace, dynamic ads
- Internal operations dashboard for managed-service fulfillment roles
- Advanced attribution and analytics, email notifications, native mobile apps, SSO
- Spanish, Hindi and Telugu experiences (content language is stored from day one)

## Platform connection
- **Connected or standalone:** Connected. Customers are identified by email plus their
  GoHighLevel contact ID. GoHighLevel is the master customer record.
- **GoHighLevel tags this product sends:** `podcasting-gg:signed-up`,
  `podcasting-gg:onboarding-complete`, `podcasting-gg:first-episode-complete`,
  `podcasting-gg:top-1-percent`. (Billing tags such as `podcasting-gg:paid` arrive with V2 billing.)
- **How it's wired:** GoHighLevel is the `crm` capability adapter in
  `app/src/adapters/crm`. V1 ships a mock plus a thin real client (contact upsert by
  email + tags). The reusable client moves to `/platform/gohighlevel` when a second
  product needs it. Shared login and billing are "planned" in `platform/` and this app
  is built so they can slot in (email is the identity key; no product-local billing).
- **How it helps customers of our other products:** every podcast guest and every
  detected opportunity is a relationship record; BusinessContent.ai can repurpose the
  same transcripts, ConnectMore.net can act on the relationship graph, Closers.team can
  work sales opportunities the Opportunity Engine finds. Natural bundles.

## Pricing
- **Not in V1.** No Stripe, no credits, no billing code. Customers bring their own AI
  keys, so AI costs nothing to us.
- **Managed-service concepts (noted for architecture, not built):** ~$5,000/month
  Content Team (4 episodes, 20 clips, 4 thumbnails, ~100 sourced prospects, ~50
  personalized outreach contacts per month, publishing support); ~$997 Account
  Manager/coordinator (onboarding, planning, pipeline, reminders, approvals,
  publishing coordination, reporting). These become configurable entitlements later,
  never hardcoded limits.

## How we'll know it's working
- **Build acceptance (now):** the 21 steps above work locally in mock mode; `pnpm check`
  and `pnpm db:local:test` pass; every screen has happy/empty/loading/error states.
- **Activation:** a customer reaches milestone 1 (Launch) within 30 days of signup, and
  10 customers reach 5 completed episodes within 90 days.
- **North star:** number of customers reaching 20 strategically completed episodes.
- **Retention signal ("Podcast Business Impact"):** per customer, count of follow-ups
  completed, introductions, accepted opportunities, booked calls, clients and revenue
  influenced (manually attributed, auditable). Tracked as underlying outcomes; no single
  opaque score.
- **Honesty rule:** analytics from unconnected providers show "not connected", never
  invented numbers.

## Original brief
The founder's brief is stored unedited at [`docs/SPEC.md`](docs/SPEC.md) (received
2026-09-28). Where this plan or `docs/DECISIONS.md` refines it, this plan wins.
