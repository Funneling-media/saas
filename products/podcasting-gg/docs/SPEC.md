# PODCASTING.GG — MASTER BUILD SPECIFICATION

> The founder's original brief, stored unedited (received 2026-09-28). This is the
> canonical starting specification. Living decisions that refine or supersede parts
> of it are recorded in `DECISIONS.md`; the product summary lives in `PRODUCT.md`.

You are taking over the design and engineering of Podcasting.gg.
Act simultaneously as the founding CTO, principal product manager, staff full-stack engineer, AI systems architect, UX/product designer, database architect, QA engineer, and DevOps engineer.
This document is the canonical starting specification.
Do not reduce this into a generic podcast-management SaaS.
Do not merely produce another PRD.
Do not spend the entire session planning.
Your job is to BUILD THE PRODUCT.
When an implementation detail is genuinely unspecified, make the most sensible product/engineering decision consistent with the principles below and continue. Do not constantly interrupt the founder with questions.

## 1. THE COMPANY
Product: Podcasting.gg
Category: Business Podcast Growth Operating System

Podcasting.gg is NOT primarily:
* podcast hosting
* recording software
* an audio editor
* an AI show-note generator
* a podcast directory
* a generic CRM
* a generic social scheduler

Those capabilities may connect to the platform, but they are not the product.
The core thesis is: A business podcast should operate as a relationship, authority, content, distribution, and revenue engine.
Podcasting.gg helps entrepreneurs strategically use conversations to generate: authority, relationships, content, partnerships, referrals, introductions, speaking opportunities, sponsorships, customers, revenue.

The desired transformation is NOT merely "Launch a podcast." It is: Build a valuable business network and authority engine through 20 strategic conversations.
The public-facing aspirational promise can be: Become a Top 1% Podcaster in 20 Episodes.
Do not technically interpret "Top 1%" as merely uploading 20 files.
The platform should guide users through meaningful milestones such as: 1. Launch 2. Consistency 3. Authority 4. Network Builder 5. Top 1%
Progress should account for quality, consistency, distribution, relationships, follow-up and business outcomes.

## 2. PRIMARY ICP
Design onboarding and the initial product primarily for high-value expertise businesses: consultants, coaches, agency owners, founders, advisors, experts, high-ticket service businesses.
These people generally care more about relationships and business outcomes than advertising CPM or entertainment-scale download numbers.
Podcasting.gg is not initially optimized for hobby podcasters.
The product should speak the language of entrepreneurs rather than audio engineers.

## 3. PRODUCT CONSTITUTION
Every major product decision should follow these principles.

Principle 1 — Business First. Every important feature should help create: authority, relationships, distribution, opportunities, revenue. Avoid vanity features merely because competing podcast tools have them.

Principle 2 — Orchestrate, Don't Rebuild. Do not unnecessarily rebuild: Riverside, podcast hosting, Descript, email infrastructure, GoHighLevel, YouTube, social publishing systems, foundation AI models. Integrate or orchestrate excellent providers. Podcasting.gg should own the workflow and intelligence layer.

Principle 3 — AI as an Intelligent Operating Layer. AI should: research, recommend, summarize, extract, draft, classify, detect opportunities, retrieve knowledge, automate repetitive work. Humans retain control over consequential external actions.

Principle 4 — Outcomes Over Activity. Downloads matter. But also measure: relationships created, introductions, meetings, opportunities, partnerships, clients, revenue influenced, authority progress.

Principle 5 — Modular by Design. Every external provider should be replaceable. Never deeply couple core business logic to one AI model, podcast host, CRM, recording service, or publishing provider.

Principle 6 — Action Over Dashboard Porn. The software should continuously answer: What should I do next? The home screen must prioritize action rather than presenting users with dozens of meaningless graphs.

## 4. CURRENT PROJECT STATE
Assume essentially nothing has been built yet unless repository inspection proves otherwise.
The founder may begin with only: a terminal, an AI coding agent, an empty or nearly empty repository.
Therefore: 1. Inspect the current directory/repository first. 2. Understand anything already present. 3. Preserve good existing work if there is any. 4. If essentially empty, initialize the project properly. 5. Build locally first. 6. Production deployment comes later.
The immediate objective is: Get a complete useful version running locally for free or as close to free as practical.
Later: Git → GitHub → Vercel.
Do NOT require production infrastructure just to use the local application.

## 5. MVP ECONOMIC CONSTRAINT
Keep V1 inexpensive. Prefer: open-source libraries, free tiers, local development, mock adapters, user-owned API credentials. Do not introduce unnecessary paid infrastructure.

## 6. CRITICAL CHANGE — NO CREDIT SYSTEM IN V1
Previous concepts involving credits are obsolete for V1.
DO NOT build: credit wallets, monthly AI credits, purchased credits, promotional credits, usage wallets, credit deductions, AI credit packs, complicated AI metering, Stripe billing for MVP.
Credits may become Version 2. Architect cleanly enough that billing/usage metering can be introduced later without rewriting the product, but DO NOT burden V1 with it.

## 7. BRING-YOUR-OWN-AI ARCHITECTURE
Users should connect their preferred AI provider. Potential providers: OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, DeepSeek, xAI, Ollama, LM Studio.
Do NOT make the entire application depend directly on OpenAI or Anthropic. Create an AI abstraction layer.
Conceptually: User Action → AI Capability → AI Service → Provider Router → Configured Provider → Model
Core features should request capabilities rather than provider-specific SDK behavior wherever practical. Examples: summarizeTranscript(), researchGuest(), generateInterviewQuestions(), generateOutreach(), extractOpportunities(), createShowNotes(), extractQuotes(), generateContentIdeas(), queryPodcastBrain().
Provider implementation happens underneath.
Where OAuth is genuinely supported and appropriate, support it. Where providers require API keys, securely allow users to enter their own credentials. Never expose secrets client-side. Encrypt/protect credentials appropriately. For local development, environment-variable configuration may also be supported.
The app should gracefully explain when an AI capability requires a provider that has not yet been configured.

## 8. PROVIDER/ADAPTER ARCHITECTURE
Do not architect Podcasting.gg around individual vendors. Architect around capabilities. Examples: RecordingProvider, HostingProvider, AIProvider, CRMProvider, ResearchProvider, EnrichmentProvider, EmailProvider, CalendarProvider, SocialPublishingProvider, AnalyticsProvider.
Each integration should expose a consistent internal interface where sensible.
Provider state should support concepts such as: disconnected, connecting, connected, degraded, error, reauthentication required.
Build mock adapters wherever live API access is unavailable. The product should remain demonstrable locally even without enterprise API access.

## 9. KNOWN/FUTURE INTEGRATIONS
Prepare the architecture for integrations including:
AI: OpenAI, Anthropic, Gemini, OpenRouter, Groq, DeepSeek, xAI, local models.
CRM / Automation: GoHighLevel. The founder already has a GoHighLevel agency account. Do not assume every customer needs their own GHL account. Long term, Podcasting.gg may use platform-managed infrastructure while still allowing customer-owned connections.
Recording: Riverside. Do not rebuild Riverside. Video-first should be the default philosophy: Record once → full video + audio + clips. Audio-only remains possible.
Editing: Potential integration with Descript, Riverside exports, other future editing providers. Editing model can evolve across plans: Starter → manual; Creator → AI recommendations; Pro → AI workflow; Managed → coordinator; Content Team → human QA/production. Do not make V1 depend on a paid editing API.
Hosting / RSS: Podcasting.gg is not intended to become a podcast hosting company in V1. Potential hosting adapter: Transistor. Track: feed URL, podcast IDs, ownership, feed validation, distribution state, migration metadata. Use manual/external hosting workflows initially if required.
Publishing / Distribution: Prepare adapters for YouTube, Spotify, Apple Podcasts, Blotato, future social channels. Do not assume Google Podcasts exists as a required destination.
Research / Data: Potential: Apify. Use provider abstraction.
Calendar / Communication: Potential: Google Calendar, Gmail. Later outreach channels may include LinkedIn, Instagram, X, SMS, WhatsApp. Initial outreach should prioritize: email, manual LinkedIn, reminders.

## 10. PRODUCT INFORMATION ARCHITECTURE
At minimum support these domains/modules: Authentication, Organizations, Workspaces / Brands, Podcasts, Home / Mission Control, Host Mode, Guest Mode, Guests / Relationships, Guest Discovery, Outreach, Episodes, Interview Preparation, Recording Workflow, Production Workflow, Content Library, Podcast Brain, Opportunity Engine, Relationship CRM, Tasks, Approval Center, Publishing, Analytics, Global Search, Brand Kit, Integrations, Settings, Team / Permissions, Internal Operations, Knowledge Base.
Avoid an enormous cluttered sidebar. Group navigation intelligently.

## 11. ORGANIZATION MODEL
Use a multi-tenant architecture from day one. Conceptually: User → Organization → Workspace / Brand → Podcast → Episodes
A user may participate in multiple organizations. An organization may have multiple workspaces/brands. A workspace can contain one or more podcasts. Keep tenant boundaries strict. Support team members.
Suggested roles: Owner, Admin, Member, Viewer.
Internal fulfillment roles can later include: account manager, strategist, researcher, outreach specialist, producer, editor, designer, QA.
Do not conflate customer permissions with internal fulfillment roles.

## 12. TWO PRIMARY OPERATING MODES
HOST MODE — Help the entrepreneur operate their own podcast. Workflow includes: define strategy, launch podcast, build brand, identify dream guests, discover guests, research guests, generate invitations, manage outreach, book interviews, prepare interviews, record, process episodes, approve, publish, repurpose, distribute, follow up, maintain relationships, detect opportunities, measure business impact.
GUEST MODE — Help the entrepreneur appear on other people's podcasts. Workflow includes: define guest positioning, create guest profile, identify relevant podcasts, research shows, research hosts, score opportunities, create personalized pitches, track outreach, track replies, track bookings, prepare appearances, track appearances, capture published appearances, follow up with hosts, track opportunities created.
These modes should share contacts, relationships, tasks, knowledge and analytics where appropriate.

## 13. ONBOARDING
Onboarding must feel like hiring a podcast strategist—not filling out SaaS settings. Collect useful information progressively.
Founder: name, role, biography, expertise, personal story, credibility, links, social profiles.
Business: business name, website, industry, business model, products/services, offer, price range, target market, ideal customer, customer pain points, differentiation, desired CTA.
Podcast: existing podcast?, podcast name, podcast description, category, goals, existing feed, current episode count, publishing cadence, desired cadence, audio/video preference, format, interview/solo/hybrid, episode duration.
Goals: authority, networking, clients, partnerships, content, speaking, sponsorship, recruiting, investor relationships, referrals.
Ideal Guest: industries, titles, audience, expertise, company size, location, relationship value, desired collaboration.
Guest Mode: topics user can speak about, proof, talking points, ideal shows, desired audiences.
Use AI after onboarding to create an initial Podcast Growth Strategy. But AI should not block onboarding if no provider is configured.

## 14. PODCAST STRATEGY
Create a structured strategy record. Potential outputs: positioning, show promise, target listener, business objective, content pillars, ideal guest archetypes, interview philosophy, CTA, distribution plan, 20-episode roadmap, relationship strategy, success metrics.
Allow users to edit everything. AI recommendations should never become irreversible truth.

## 15. TOP 1% / 20 EPISODE SYSTEM
This should be a visible product mechanic. Show progress such as: Episode 7 / 20. But do not gamify uploads alone.
An episode should count as meaningfully complete when appropriate workflow requirements are satisfied. Potential completion requirements: recording completed, long-form episode prepared/published, audio published where applicable, transcript stored, show notes completed, title completed, thumbnail/artwork completed where relevant, feed/distribution updated, guest follow-up completed.
Repurposed content may be generated alongside this process.
Milestones: Launch, Consistent, Authority, Network Builder, Top 1%.
Make milestone logic configurable rather than hardcoded into random UI components.

## 16. HOME — MISSION CONTROL
The home screen must answer: What should I do today to grow my podcast and business? Do not lead with vanity analytics.
Possible UI — Today's Mission: Invite 3 high-value guests; Approve Episode 12; Follow up with Sarah; Publish Episode 11; Reply to Mike; Pitch yourself to one relevant podcast; Review new opportunity detected by AI.
Then show concise progress. Possible metrics: 13 / 20 Episodes, Relationship Score, Authority Score, opportunities, follow-ups due, clients generated, revenue influenced.
Do not fabricate scores. If Relationship Score or Authority Score exists, define transparent inputs.
The dashboard should feel like an operating system rather than an analytics graveyard.

## 17. GUEST PIPELINE
Create a strong guest CRM/pipeline. Guest lifecycle may include: Prospect, Researched, Approved, Ready to Contact, Contacted, Replied, Interested, Booking, Booked, Preparation, Recorded, Production, Published, Follow-up, Relationship.
Support list and pipeline/kanban views where useful.
Guest profile should include: name, title, company, bio, email, phone where available, social URLs, website, location, expertise, audience, notes, research, relationship status, source, tags, outreach history, episodes, opportunities, introductions, tasks, value/fit scores, consent/release status.

## 18. GUEST QUALITY SCORE
Do not rank guests merely by follower count. Potential inputs: expertise fit, audience overlap, credibility, relationship value, collaboration potential, business relevance, response probability, unique perspective, strategic opportunity.
Keep score explainable. Users must be able to override AI recommendations.

## 19. GUEST RESEARCH
Research should generate useful briefing information, potentially: biography, current role, company, expertise, notable accomplishments, recent work, books, products, interviews, content themes, likely interests, relevant overlap with host, potential opening hooks, thoughtful questions, controversial/sensitive areas to avoid if appropriate, relationship opportunities, collaboration opportunities, sources.
When external web research is unavailable, allow manual URLs/notes and AI analysis. Never fabricate research. Distinguish sourced facts from AI suggestions.

## 20. OUTREACH
Launch scope: email, manual LinkedIn workflow, follow-up reminders. Future: Instagram, X, SMS, WhatsApp.
Outreach system should support: templates, personalized drafts, sequences, contact history, statuses, scheduled follow-up, manual approval, opt-out/suppression, bounce tracking where supported.
AI can draft outreach. Do not autonomously blast messages by default. Require approval for consequential outbound communication unless user explicitly configures automation.

## 21. EMAIL INFRASTRUCTURE PRINCIPLE
Do not create one shared cold-email identity for all customers. Long-term architecture should support dedicated sender identities/domains/connections.
Track where supported: sender identity, domain health, bounces, suppression, opt-outs, compliance status.
Do not overbuild deliverability infrastructure before it is required.

## 22. INTERVIEW PREPARATION
Once a guest is booked, create an Interview Brief. Include: guest summary, relationship context, why they matter, objectives, opening, key themes, suggested questions, follow-up questions, stories worth exploring, business/context opportunities, CTA, topics to avoid, previous interactions, relevant links, notes.
Users can edit and approve. AI should adapt questions to avoid generic interview questions.

## 23. RECORDING
Video-first philosophy. Preferred model: Record once → full video → audio → clips → transcript → knowledge.
Do not build a video recording engine in MVP. Allow: recording URL, external recording link, uploaded media metadata, recording status, future Riverside integration.

## 24. EPISODE WORKFLOW
A canonical episode lifecycle should approximately support: Idea → Research → Guest Booked → Preparation → Recording → Editing → Review → Approval → Publishing → Repurposing → Distribution → Guest Follow-up → Relationship Tracking
Statuses should be typed and controlled. Avoid free-form status chaos.
Episode record should support: podcast, guest(s), title, description, episode number, season, status, recording date, publish date, recording URL, source media, transcript, show notes, chapters, keywords, CTA, thumbnail, full video, audio, clips, assets, publishing destinations, approvals, tasks, opportunities, analytics, internal notes.

## 25. TRANSCRIPTS
Transcript is a first-class object, not a giant text field buried inside an episode. Support: transcript text, segments, timestamps when available, speakers, source, language, processing status, metadata, embeddings later/currently if practical.
Do not require automatic transcription in the first local build. Allow: paste transcript, upload transcript, future provider import.

## 26. PODCAST BRAIN™
This is a major product differentiator. Every useful conversation becomes durable organizational knowledge.
Podcast Brain should index: transcripts, episodes, guests, topics, quotes, frameworks, stories, ideas, questions, CTAs, opportunities, notes, generated content.
Users should eventually be able to ask natural-language questions such as: Which guests discussed AI? Find every conversation where private equity came up. What have I said about lead generation? Find my best stories. Find my strongest quotes. Turn my ideas into a keynote. Outline a book from my conversations. Build a course from my frameworks. Which guests should I reconnect with? What promises have I made? What follow-ups have I forgotten? Find potential clips about sales. What ideas do I repeat most? What have I changed my mind about? Which episodes created business opportunities?
For local MVP, build this progressively. A basic text search + structured extraction is acceptable first. Architect so semantic/vector search can be introduced cleanly. If Supabase pgvector is practical, design for it. Do not make the whole app fail if embeddings are unavailable.

## 27. ANTI-REPETITION ENGINE
The knowledge layer should eventually detect unnecessary repetition across: interview questions, topics, hooks, guests, content ideas, outreach copy. Warn users rather than preventing intentional repetition.

## 28. CONTENT LIBRARY
Create a central searchable content library. Potential asset types: full episodes, transcripts, clips, shorts, quotes, frameworks, stories, thumbnails, social posts, show notes, email ideas, hooks, titles, descriptions, CTAs, documents, generated assets.
Assets should connect back to their source episode/transcript wherever possible.

## 29. CONTENT REPURPOSING
From one conversation, eventually help produce: long-form video, audio episode, clips, short-form posts, LinkedIn posts, X posts, emails, quote graphics, blog/article, newsletter, episode summary, show notes, chapters, titles, hooks, thumbnail concepts.
Do not attempt to build a full video editor. Generate metadata, briefs, copy, selections and provider jobs.

## 30. RELATIONSHIP CRM
This is one of the most important distinctions from normal podcast software.
Production CRM answers: Where is the episode? Relationship CRM answers: What happened because I had this conversation?
Track relationship categories such as: guest, host, partner, sponsor, investor, client, prospect, referral source, mentor, friend, speaker/event organizer, employee/recruit, introducer.
Track: interactions, notes, last interaction, next follow-up, relationship strength, introductions, opportunities, revenue, influenced revenue, tasks, episodes/appearances, tags.
Relationship records should connect to contacts rather than duplicating people everywhere.

## 31. OPPORTUNITY ENGINE™
Another major differentiator. AI analyzes conversations and identifies business opportunities.
Examples: "You should meet my partner." → Introduction Opportunity. "We are looking for someone who does X." → Sales / Service Opportunity. "We're hiring." → Hiring Opportunity. Someone mentions a conference → Speaking Opportunity. Someone discusses sponsorship → Sponsor Opportunity. Someone discusses investing → Investment Opportunity.
Possible opportunity types: sales, referral, introduction, partnership, sponsorship, speaking, hiring, investment, collaboration, media, content, other.
Each opportunity can contain: source transcript, exact supporting excerpt, source timestamp where available, person, episode, type, summary, potential value, confidence, priority, next action, due date, owner, status.
Never silently treat an AI inference as fact. Show why the opportunity was detected. Allow: Accept, Dismiss, Edit, Convert to Task.

## 32. TASK SYSTEM
Tasks are central. Possible sources: user-created, episode workflow, guest workflow, opportunity, AI recommendation, internal operations, publishing, follow-up.
Task fields: title, description, status, priority, assignee, due date, source, related contact, related guest, related episode, related opportunity, organization/workspace, completion metadata.
Mission Control should intelligently surface the highest-value due actions.

## 33. APPROVAL CENTER
Create one central inbox for things requiring human approval. Possible approval objects: outreach, titles, thumbnails, show notes, clips, social copy, publication, opportunity extraction, sponsorship content.
AI may automatically perform low-risk internal actions such as: research, drafts, extraction, classification, analytics. High-impact external actions should be approval-driven by default.

## 34. BRAND KIT
Persistent brand configuration. Potential fields/assets: logo, alternate logo, colors, fonts, podcast artwork, thumbnail templates, intro, outro, watermark, lower thirds, CTA, URL, social handles, tone, voice guidelines, prohibited phrases, example content.
AI generation should use the Brand Kit.

## 35. GUEST EXPERIENCE
Guests should NOT need to create a Podcasting.gg account merely to participate. Use magic-link style external pages where appropriate.
Possible guest portal functions: confirm details, biography, headshot, social links, booking link, scheduling, recording instructions, release/consent, preparation, episode preview if allowed, sharing kit after publication. Keep friction low.

## 36. GUEST RELEASE / CONSENT
Track releases. Potential consent fields: recording consent, publishing rights, editing permission, promotional reuse, AI processing permission, date, release version, signature/acceptance evidence.
Do not pretend this constitutes jurisdiction-specific legal advice. Build configurable consent/version tracking.

## 37. GUEST SHARING KIT
After publishing, generate a sharing package. Potential contents: thank-you note, episode link, clips, quote graphics, suggested captions, email copy, social copy, referral/introduction invitation.
Goal: Make the guest WANT to distribute the episode.

## 38. GUEST MODE / PODCAST APPEARANCE ENGINE
Create a separate but connected workflow for getting the user booked on other podcasts.
Guest profile includes: biography, expertise, topics, credibility, achievements, stories, talking points, previous appearances, headshots, links, audience, CTA.
Podcast opportunity record: show, host, URL, category, audience, fit, authority, research, contact, outreach, status, booking, appearance, published link, follow-up, relationship, resulting opportunity.
Do not build a public marketplace in V1. Architect data so a future Podcasting.gg marketplace could match hosts and guests.

## 39. FUTURE MARKETPLACE
NOT MVP. But future architecture may support: host profiles, guest profiles, discovery, matching, invitations, ratings/reputation, relationship graph. Do not prematurely expose a public marketplace.

## 40. PUBLISHING
Podcasting.gg orchestrates publishing. Do not become a media hosting company unnecessarily.
Publishing destination model should support: destination, connection, status, scheduled date, published date, external ID, external URL, error, retry state.
Destinations may include: podcast RSS host, YouTube, Spotify, Apple Podcasts, social networks.
Mock publishing must exist for local testing.

## 41. BACKGROUND JOB ENGINE
Do not perform long-running AI/provider operations inside fragile page requests. Architect background jobs.
Potential job states: queued, running, waiting, completed, failed, retrying, cancelled.
Jobs need: idempotency, retries, error logging, timestamps, related resource, provider, safe retry behavior.
Potential jobs: transcript processing, AI extraction, embeddings, guest research, asset generation, publishing, provider sync, analytics sync, email sequences, imports.
For V1/local use, choose a solution that does not introduce unnecessary paid complexity. Potential future job infrastructure can include Trigger.dev or Inngest. Use the simplest reliable architecture compatible with later migration.

## 42. ANALYTICS
Analytics should combine media metrics and business impact.
Media: episodes published, consistency, views, listens, watch time where available, audience growth, clip performance, destination performance.
Business: relationships created, follow-ups, introductions, opportunities, booked calls, clients, partnerships, speaking, sponsors, direct revenue, influenced revenue.
Do not fake external analytics. Show unavailable/unconnected states honestly.

## 43. REVENUE ATTRIBUTION
Prepare for: UTMs, booking links, source attribution, opportunity value, direct revenue, influenced revenue, manually attributed revenue.
Revenue influence must be editable and auditable. Avoid pretending correlation equals causation.

## 44. LAUNCH READINESS SCORE
Before a podcast launch, show a readiness checklist/score. Possible dimensions: podcast positioning, description, artwork, trailer, host profile, CTA, first guests, first episodes, distribution, guest workflow, recording workflow, brand kit.
Make it actionable. Do not create a meaningless percentage without explaining what's incomplete.

## 45. SEARCH
Create global search across: podcasts, episodes, guests, contacts, transcripts, quotes, topics, opportunities, tasks, assets, notes. Command palette can expose search and actions.

## 46. KNOWLEDGE / SEMANTIC SEARCH
Long-term architecture should support embeddings and retrieval. Potential model: source document → chunks → embeddings → metadata → semantic retrieval → AI synthesis.
Maintain source traceability. Podcast Brain answers should reference the underlying episodes/transcripts.

## 47. MULTILINGUAL ARCHITECTURE
Architect for multilingual content. Initial UI/product language: English. Future high-priority languages: Spanish, Hindi, Telugu.
Do not hardcode assumptions that transcripts are English. Store language metadata.

## 48. INTERNAL OPERATIONS DASHBOARD
The business may sell managed services. Therefore support internal operations eventually.
Potential roles: Account Manager, Strategist, Researcher, Outreach Specialist, Producer, Editor, Designer, QA.
Internal dashboard should track: customer, podcast, account health, overdue work, recordings, production, approvals, publishing, blocked jobs, assigned tasks, SLA/aging, owner.
Keep customer UI clean. Internal operations should not pollute the normal customer experience.

## 49. MANAGED SERVICES
Podcasting.gg may combine SaaS + managed service.
Approved premium service concept: Approximately $5,000/month Content Team. Working fulfillment target: 4 episodes/month, 20 clips/month, 4 thumbnails/month, approximately 100 sourced prospects/month, approximately 50 personalized outreach contacts/month, publishing support.
Treat these as configurable service entitlements, NOT permanent hardcoded SaaS limitations.
There may also be an Account Manager/coordinator service around approximately $997. Account manager responsibilities can include: onboarding, planning, guest pipeline, reminders, approvals, publishing coordination, reporting. An account manager is NOT unlimited production labor.
Pricing is NOT part of MVP. Do not build Stripe now. These service concepts exist so architecture does not make managed fulfillment impossible later.

## 50. DESIGN DIRECTION
The application should feel intentionally designed. Reference quality: Linear, Stripe, Vercel, Notion, Superhuman. Do NOT literally clone them.
Desired characteristics: premium, minimal, fast, information-dense without clutter, professional, founder/business oriented, excellent typography, consistent spacing, responsive, excellent dark mode, excellent light mode, polished empty states, useful loading states, keyboard-friendly, command palette, accessible.
Avoid: generic AI gradients, excessive purple, neon cyberpunk, glassmorphism everywhere, giant rounded cards, excessive shadows, cartoonish SaaS illustrations, enormous headings wasting space, dashboard full of meaningless cards, fake analytics.
Use a coherent design token system. Use shadcn/ui as primitives if appropriate, but do NOT let the application look like an untouched shadcn starter.

## 51. UX PRINCIPLE
Every screen should have a clear job. Every empty state should teach the next action. Every error should explain recovery. Every integration should explain what connecting it enables.
Do not expose technical provider jargon unnecessarily to nontechnical business owners.

## 52. RECOMMENDED TECHNICAL STACK
Unless repository constraints strongly justify otherwise: Next.js current stable, React, TypeScript strict mode, App Router, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL, Supabase Auth, Supabase Storage, Supabase RLS, Zod, React Hook Form, TanStack Query where useful, Server Actions / route handlers where appropriate, pgvector when semantic search is implemented, Vercel-compatible architecture, Sentry later/when appropriate.
Avoid unnecessary framework proliferation. Do not introduce Prisma automatically if Supabase/Postgres tooling provides a cleaner implementation. Decide intentionally.

## 53. DATABASE PHILOSOPHY
Build a normalized production-quality schema. Use: UUID primary keys, created_at, updated_at, organization/workspace scoping, foreign keys, indexes, enums/controlled statuses where appropriate, soft delete where appropriate, auditability.
Potential entities include: users/profiles, organizations, organization_members, workspaces, workspace_members, podcasts, podcast_strategies, brand_kits, contacts, relationships, guests, guest_research, podcast_opportunities, outreach_campaigns, outreach_messages, bookings, episodes, episode_guests, transcripts, transcript_segments, content_assets, topics, quotes, knowledge_chunks, opportunities, tasks, approvals, integrations, provider_connections, publishing_destinations, publishing_jobs, background_jobs, analytics_snapshots, attribution_events, revenue_events, guest_releases, sharing_kits, notifications, audit_logs.
Do not blindly create all tables before understanding relationships. Design schema intentionally.

## 54. SECURITY
Security is non-negotiable. Implement: authentication, authorization, tenant isolation, RLS, secure server-side provider credentials, validation, safe file uploads, protected API routes, least privilege, audit logging for important actions.
Never send secret API keys to the browser after storage. Never log secrets. Never commit secrets. Create `.env.example`.

## 55. DATA PORTABILITY
Users should ultimately own their data. Architect exports for: podcast data, guests/contacts, transcripts, assets, analytics, opportunities, relationship CRM, knowledge base. Avoid artificial lock-in.

## 56. LOCAL-FIRST DEVELOPMENT REQUIREMENT
The founder wants to build this offline/local first, then deploy. The application must have a straightforward local developer experience.
Provide: setup instructions, environment variable documentation, database setup, migrations, seed/demo data, mock integrations, sample organization, sample podcast, sample guests, sample episodes, sample transcript, sample opportunities.
Where an external dependency prevents fully offline operation, isolate it and provide a mock/local fallback rather than breaking the application.

## 57. MOCK MODE
This is mandatory. The founder does not yet have enterprise/API access for every provider.
Every important external integration should either: 1. work through available API access, OR 2. expose a mock/manual workflow.
The entire application must be testable without buying Riverside Business, Transistor, Blotato, Apify, etc.
No Riverside? → manually attach recording URL. No transcription API? → paste/upload transcript. No hosting API? → manually record feed/published URL. No social API? → create export-ready assets and mark/manual publish. No AI provider? → disable AI action gracefully and show connection instructions.

## 58. AI AGENTS / CAPABILITIES
Podcast Strategist (creates/editable podcast strategy). Dream Guest Finder (defines ideal guest archetypes and candidates). Guest Researcher (creates sourced guest briefs). Outreach Writer (drafts personalized outreach). Interview Coach (creates contextual interview briefs/questions). Episode Producer (helps organize episode metadata and production workflow). Publishing Assistant (drafts titles, descriptions, chapters, show notes and distribution copy). Repurposing Assistant (identifies clips, quotes, posts, hooks and content). Opportunity Engine (extracts business opportunities from conversations). Podcast Brain (retrieves/synthesizes knowledge from the user's archive). Relationship Assistant (suggests follow-ups and reconnections).
Do not implement these as disconnected chatbot pages. AI should appear inside the workflow where the user needs it.

## 59. STRUCTURED AI OUTPUT
For automation-critical AI actions, prefer structured output validated with schemas. Example opportunity extraction should return structured objects rather than prose that must be regex-parsed. Validate with Zod.
Handle: invalid output, retry, provider failure, timeout, missing fields. Store provenance where important.

## 60. AI MEMORY
Do not create one giant unbounded prompt containing the user's entire company. Use structured context.
Potential context layers: founder profile, business profile, podcast strategy, brand voice, guest, episode, transcript retrieval, previous relationship history, current task. Retrieve only relevant context.

## 61. MANUAL OVERRIDE
Anything AI generates should generally be editable. AI is not authoritative. Never overwrite user-edited content without explicit action. Track generated vs edited states where useful.

## 62. BACKGROUND PROCESSING
Long-running actions should not freeze the UI. Use async processing patterns. UI states: queued, processing, complete, failed, retry available. Show meaningful progress.

## 63. NOTIFICATIONS
Build a basic notification architecture. Potential triggers: interview tomorrow, follow-up due, episode awaiting approval, publishing failed, opportunity detected, integration disconnected, task overdue. In-app first. Email later. Avoid notification spam.

## 64. ACTIVITY / AUDIT HISTORY
Important objects should have understandable activity history. Examples: guest contacted, booking confirmed, transcript imported, AI opportunity detected, title approved, episode published, follow-up completed. Useful for both teams and managed services.

## 65. VERSION 1 SCOPE PRIORITY
Do not try to make every future integration production-ready before the core loop works. The strongest V1 loop is:
1. User signs up. 2. Creates organization/workspace. 3. Completes business/podcast onboarding. 4. Creates podcast strategy. 5. Adds/discovers guests. 6. Researches guest. 7. Generates outreach. 8. Tracks booking. 9. Generates interview brief. 10. Creates/records episode externally. 11. Imports/pastes transcript. 12. AI analyzes transcript. 13. Show notes/content/quotes are generated. 14. Opportunity Engine detects business opportunities. 15. User accepts/dismisses opportunities. 16. Relationship CRM updates. 17. Publishing workflow is tracked. 18. Guest sharing/follow-up happens. 19. Dashboard surfaces next best actions. 20. Podcast Brain makes accumulated knowledge searchable. 21. User progresses toward 20 strategic completed episodes.
Get this loop excellent before adding dozens of secondary integrations.

## 66. VERSION 1 SHOULD INCLUDE
authentication; multi-tenant organization/workspace; onboarding; podcast creation; podcast strategy; Host Mode; basic Guest Mode; guest/contact CRM; guest pipeline; guest profile; manual guest research + AI research capability; outreach drafts/tracking; episode pipeline; episode details; interview brief; transcript import/paste; AI provider settings; AI abstraction; transcript analysis; Podcast Brain foundation; Opportunity Engine; tasks; approvals foundation; Relationship CRM; Content Library; Brand Kit; manual/mock publishing; integrations/settings architecture; global search; dashboard/Mission Control; demo data; local development; responsive UI.

## 67. VERSION 1 DOES NOT NEED
built-in podcast hosting; built-in video recording; full video editor; public marketplace; native iOS app; native Android app; sophisticated billing; credit system; sponsor marketplace; full dynamic ad insertion; every social API; enterprise Riverside access; complicated AI metering; massive data enrichment stack; perfect analytics ingestion. Build extension points instead.

## 68. VERSION 2 / FUTURE
credits if business model requires them; subscriptions/billing; sponsor marketplace; host/guest marketplace; dynamic ads; advanced attribution; advanced analytics; automatic multichannel publishing; deeper Riverside integration; deeper podcast-host integration; richer AI automation; team workload management; native/mobile apps; private podcasts; advanced monetization; enterprise SSO/security; advanced multilingual workflows. Do not pollute V1 with premature implementation.

## 69. BUILD QUALITY
Strict TypeScript. No `any` abuse. No enormous god components. No duplicated business logic. No provider logic scattered throughout React components.
Separate: domain logic, UI, services, adapters, repositories/data access, AI capabilities, validation, background jobs. Use reusable primitives without creating abstraction theater.

## 70. ERROR HANDLING
Every external provider will fail eventually. Handle: missing credentials, invalid credentials, quota exhausted, rate limit, timeout, malformed response, network failure, disconnected integration, deleted external resource.
User-facing errors should explain: What happened. What was preserved. What the user can do next.

## 71. OBSERVABILITY
Prepare for: structured logs, job logs, provider errors, audit logs, Sentry/error monitoring later, performance monitoring. Do not log sensitive data.

## 72. PERFORMANCE
The app should feel fast. Use: server rendering appropriately, pagination, indexes, lazy loading, optimized queries, caching where safe, background work, optimistic UI only when failure is recoverable. Avoid loading entire transcripts unnecessarily.

## 73. ACCESSIBILITY
Use: semantic HTML, keyboard navigation, visible focus, labels, adequate contrast, accessible dialogs, proper table semantics. Accessibility is part of quality, not an afterthought.

## 74. RESPONSIVE EXPERIENCE
Primary launch: Responsive web. Desktop experience can be richer. Mobile should support useful operational tasks such as: review dashboard, approve content, view guest, complete follow-up, update opportunity, read brief, manage tasks. Do not force desktop-only layouts onto mobile.

## 75. SAMPLE DATA
Create high-quality seed/demo data. Example — Organization: Acme Advisory. Podcast: The Founder Growth Show. Episodes: multiple lifecycle stages. Guests: realistic fictional business people. Transcript: realistic business interview. Opportunities: introduction, speaking, sales, partnership. Tasks: due today/upcoming/complete.
Do not use lorem ipsum everywhere. The product should look convincing locally.

## 76. DOCUMENTATION
Maintain living project documentation. At minimum: README.md, docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/DATABASE.md, docs/AI.md, docs/INTEGRATIONS.md, docs/LOCAL_DEVELOPMENT.md, docs/DEPLOYMENT.md, docs/DECISIONS.md.
As implementation decisions change, update docs. The repository—not chat history—must become the long-term source of truth.

## 77. ARCHITECTURE DECISION LOG
When making consequential decisions, record: decision, context, alternatives, choice, rationale, implications. Do not repeatedly revisit settled decisions without new evidence.

## 78. TESTING
Create useful tests. Prioritize: tenant isolation, permissions, business logic, status transitions, AI structured parsing, opportunity creation, task generation, provider abstraction, critical workflows. Do not generate hundreds of meaningless tests merely to increase coverage.

## 79. ACCEPTANCE STANDARD
A feature is NOT complete because a page renders. It is complete when: happy path works, empty state works, loading state works, error state works, validation works, authorization works, persistence works, responsive layout works, relevant tests pass.

## 80. DEPLOYMENT TARGET
Build locally first. Eventually deploy: Frontend/application: Vercel. Database/Auth/Storage: Supabase. Repository: GitHub. Do not prematurely deploy before local functionality is stable. Keep deployment configuration clean enough that moving to Vercel is straightforward.

## 81. PRODUCT OWNERSHIP POLICY
The user owns their: podcast, content, transcripts, uploaded assets, relationships, CRM data, knowledge, generated outputs subject to applicable provider terms. Avoid architecture that artificially traps customer data.

## 82. PROVIDER OWNERSHIP POLICY
Support both patterns long-term: Platform-managed integrations where economically/technically appropriate, AND customer-connected integrations. For AI in V1, prioritize customer-connected/BYOK.

## 83. BUSINESS MODEL CONTEXT
Long term this is: B2B SaaS + Managed Services. But monetization should not distort the local MVP. Pricing can be implemented later. The software architecture should support future plans/entitlements without implementing fake pricing now.

## 84. PRODUCT MOAT
Do NOT think the moat is "AI writes show notes." That is commoditized.
The potential moat is the combination of: 1. strategic guest discovery 2. relationship graph 3. accumulated conversation knowledge 4. Podcast Brain 5. Opportunity Engine 6. business attribution 7. host + guest workflows 8. operational data from repeated podcasting workflows.
Over time Podcasting.gg should understand: who the founder knows, what everyone discussed, what the founder believes, what opportunities emerged, who should reconnect, what content performs, which conversations created business value. That intelligence compounds with every episode.

## 85. DO NOT OVERCOMPLICATE THE NAME "M2M BLACK CLOUD"
The founder previously heard/referenced the phrase "M2M Black Cloud" but does NOT have a specific technical requirement attached to it. Ignore the phrase.
The intended concept is simply: Podcasting.gg presents ONE cohesive product while external providers are hidden behind modular adapters. Users should not need to understand the underlying orchestration. That is the requirement. Do not invent an architecture around the phrase.

## 86. HOW TO OPERATE AS THE CODING AGENT
Do not merely respond with another architecture essay. You have authority to make reasonable implementation decisions. Operate as an autonomous founding engineering team.
At the beginning: 1. Inspect repository. 2. Inspect installed tooling. 3. Understand current state. 4. Create/update project documentation. 5. Produce concise implementation plan. 6. Start building immediately.
Do NOT ask the founder dozens of technical questions they cannot reasonably answer. Examples of decisions YOU should make: exact table names, folder structure, component organization, state-management implementation, migration format, schema indexes, query patterns, testing library, accessible component details.
Ask only when the answer materially changes the business/product direction and cannot safely be inferred from this specification.

## 87. IMPLEMENTATION ORDER
MILESTONE 0 — FOUNDATION: inspect repository, initialize project, linting, formatting, strict TypeScript, environment config, documentation, design tokens, base shell, test setup.
MILESTONE 1 — DATA + AUTH: Supabase, schema, migrations, auth, profiles, organizations, memberships, workspaces, RLS, seed data.
MILESTONE 2 — APPLICATION SHELL: navigation, workspace switcher, command palette, global search foundation, responsive layout, settings.
MILESTONE 3 — ONBOARDING + STRATEGY: founder/business profile, podcast onboarding, podcast creation, strategy, 20-episode progress.
MILESTONE 4 — CONTACTS + GUESTS: contacts, relationships, guest pipeline, guest details, research, tasks, outreach foundation.
MILESTONE 5 — EPISODES: episode pipeline, episode detail, interview briefs, recording metadata, transcript import, production states, approvals.
MILESTONE 6 — AI FOUNDATION: provider abstraction, provider configuration, model selection, structured outputs, AI service, failure handling. Connect at least one provider when credentials are available. Keep others adapter-ready.
MILESTONE 7 — PODCAST BRAIN: knowledge ingestion, search, transcript chunks, retrieval, citations/source links, conversational query UX.
MILESTONE 8 — OPPORTUNITY ENGINE: structured extraction, evidence, confidence, accept/dismiss/edit, convert to task, link relationships.
MILESTONE 9 — CONTENT + PUBLISHING: Content Library, generated metadata, repurposing outputs, Brand Kit, manual/mock publishing, destination adapters.
MILESTONE 10 — GUEST MODE: guest positioning, target podcast records, outreach pipeline, bookings, appearances, host relationships.
MILESTONE 11 — MISSION CONTROL + ANALYTICS: today's actions, 20-episode progress, relationship metrics, opportunities, useful analytics, launch readiness.
MILESTONE 12 — HARDENING: responsive QA, permissions, RLS audit, error states, loading states, performance, accessibility, tests, docs, deployment readiness.

## 88. CONTINUITY RULE
Do not destroy working features to implement later milestones. Before substantial changes: inspect existing implementation, understand dependencies, preserve architecture, migrate safely. Use version control. Commit logical milestones when appropriate.

## 89. NO FAKE COMPLETION
Never claim "Integration complete" if it is only a button. Never claim "AI implemented" if the result is hardcoded. Never claim "Analytics implemented" using fake production numbers.
Clearly distinguish: real, mock, manual, planned. Mock mode is acceptable. Dishonesty about implementation status is not.

## 90. QUALITY BAR FOR THE FRONTEND
Do not treat UI as an afterthought. Before declaring a screen complete, inspect it visually. Check: hierarchy, typography, density, alignment, spacing, states, mobile, dark/light themes, obvious actions, usability.
Avoid a repetitive grid of generic cards. Use appropriate interface patterns: tables for dense data, kanban for pipelines, drawers for contextual editing, command menu for fast actions, timelines for history, split views where useful, progress indicators for workflows.

## 91. DESIRED EXPERIENCE
The founder should eventually be able to open Podcasting.gg in the morning and immediately understand: "Here are the three things I need to do today to make my podcast produce business."
They should then be able to: research a guest → send/prepare outreach → book them → prepare intelligently → record externally → import the conversation → transform it into content → publish → nurture the relationship → capture opportunities → reuse the knowledge forever. That is the experience.

## 92. THE FLYWHEEL
Find Valuable Person → Start Relationship → Have Valuable Conversation → Publish Valuable Content → Distribute → Strengthen Relationship → Extract Knowledge → Detect Opportunity → Follow Up → Create Business Outcome → Find Next Valuable Person
Every episode should make the user's network, knowledge base, authority and opportunity graph stronger.

## 93. NORTH STAR
The initial activation milestone: 20 strategically completed episodes. Long-term retention metric: Podcast Business Impact. This may combine measurable outcomes such as: consistent publishing, valuable relationships, introductions, opportunities, partnerships, speaking, customers, revenue influence.
Do not invent one opaque score just to display a number. Track the underlying outcomes first.

## 94. IMPORTANT PRODUCT JUDGMENT
When deciding between: A) another podcast-production feature and B) a feature that helps turn conversations into relationships/business outcomes, strongly prefer B unless A is necessary to complete the workflow. Recording and editing are increasingly commoditized. Relationship intelligence is where Podcasting.gg can differentiate.

## 95. WHAT SUCCESS LOOKS LIKE FOR THIS BUILD
A successful local V1 lets me: 1. Run the app locally. 2. Create/login to an account. 3. Create an organization/workspace. 4. Complete onboarding. 5. Create my podcast. 6. See a useful strategy. 7. Add/manage guests. 8. Research a guest manually or using connected AI. 9. Create outreach. 10. Move guest through pipeline. 11. Create/book an episode. 12. Generate an interview brief. 13. Record elsewhere. 14. Paste/import transcript. 15. Analyze it. 16. Extract content. 17. Detect opportunities with supporting evidence. 18. Manage relationships. 19. Create/complete follow-ups. 20. Track publishing. 21. Search accumulated podcast knowledge. 22. Ask Podcast Brain useful questions. 23. Operate Host Mode. 24. Operate basic Guest Mode. 25. See exactly what I should do next. 26. Track progress toward 20 episodes. 27. Do all of this without a credit system. 28. Do it without requiring expensive enterprise APIs. 29. Connect my own AI provider when desired. 30. Eventually deploy the same architecture to Vercel.

## 96. YOUR FIRST ACTION NOW
Do not answer me with a giant restatement of this specification. Do the work. Start by inspecting the current repository and development environment.
Then: 1. Tell me briefly what currently exists. 2. Create the canonical docs from this specification. 3. Establish the technical architecture. 4. Create the initial database/schema plan. 5. Establish the design system. 6. Initialize/fix the application foundation. 7. Begin Milestone 1. 8. Run the application/tests yourself whenever your environment permits it. 9. Fix errors instead of handing them back to me whenever you can. 10. Continue milestone-by-milestone.
When you need an external credential/API that I do not yet have: DO NOT STOP THE BUILD. Implement the provider interface, mock/manual fallback and settings UI. Then tell me exactly: what account/API is needed, why it is needed, where to obtain the credential, which environment variable/config field receives it, what functionality becomes available after connecting it. Continue everything else that does not depend on that credential.

## 97. FINAL DIRECTIVE
You are not here to generate a prototype that looks good in screenshots. You are building the foundation of Podcasting.gg.
Think like a founder. Think like a CTO. Think like a product designer. Think like the business owner using it every morning.
Prefer working software over speculative complexity. Prefer clear workflows over feature count. Prefer modular architecture over vendor lock-in. Prefer real business outcomes over podcast vanity metrics. Prefer shipping the core flywheel over endlessly planning future functionality.
Maintain the vision: Podcasting.gg should turn strategic conversations into authority, relationships, reusable knowledge, opportunities and revenue.
Now inspect the repository and begin building.
