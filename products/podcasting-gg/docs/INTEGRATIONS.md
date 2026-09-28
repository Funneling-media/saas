# Integrations

**Plain-English summary.** Podcasting.gg connects to other tools rather than rebuilding
them. Every integration below is labeled honestly: **real** (working against the live
service), **mock** (a stand-in so the product runs locally), **manual** (you do the step
yourself and record the result in the app), or **planned** (designed for, not built).
The app runs fully with everything in mock/manual mode. The last section lists exactly
what the founder needs to supply to switch a piece to real.

Labels are also shown in the app under Settings → Integrations. Provider connection
states: `disconnected / connecting / connected / degraded / error / reauth_required`.

## AI (`ai` capability)
Customers connect their own key in Settings → AI (BYO-AI). Full details: [`AI.md`](AI.md).

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| OpenAI | real | All AI capabilities | API key | platform.openai.com → API keys | Settings → AI (`provider_connections`), or `AI_DEFAULT_*` for dev |
| Anthropic | real | All AI capabilities | API key | console.anthropic.com → API keys | Settings → AI, or `AI_DEFAULT_*` |
| Google Gemini | real | All AI capabilities | API key | aistudio.google.com → Get API key | Settings → AI, or `AI_DEFAULT_*` |
| OpenRouter | real (OpenAI-compatible) | Many models with one key | API key | openrouter.ai → Keys | Settings → AI; base URL preset |
| Groq | real (OpenAI-compatible) | Fast open-weight models | API key | console.groq.com | Settings → AI |
| DeepSeek | real (OpenAI-compatible) | DeepSeek models | API key | platform.deepseek.com | Settings → AI |
| xAI | real (OpenAI-compatible) | Grok models | API key | console.x.ai | Settings → AI |
| Ollama | real (OpenAI-compatible, local) | Free local models, no key | none; base URL | ollama.com (install locally) | Settings → AI → base URL `http://localhost:11434/v1` |
| LM Studio | real (OpenAI-compatible, local) | Free local models, no key | none; base URL | lmstudio.ai | Settings → AI → base URL `http://localhost:1234/v1` |
| Mock AI | mock | Demo every capability offline with labeled sample output | none | built in | Settings → AI → "Mock (demo)" (dev only) |

"Real" here means the adapter is implemented and exercised against the live API when a
key is present. Model lists are curated defaults plus a free-text model field.

## CRM / platform (`crm` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| GoHighLevel (Funneling Media agency) | real (thin) + mock | Customer identified in GHL: contact upsert by email on signup; tags `podcasting-gg:signed-up`, `podcasting-gg:onboarding-complete`, `podcasting-gg:first-episode-complete`, `podcasting-gg:top-1-percent` | Private Integration token (or Location API key) + Location ID | GHL → sub-account → Settings → Private Integrations (or Business Profile for Location ID) | `GHL_API_KEY`, `GHL_LOCATION_ID` (platform-level, not per customer) |

Planned: pipelines/opportunities sync, customer-owned GHL connections, moving the
client to `/platform/gohighlevel` when a second product needs it (ADR-009). Customers
do **not** need their own GHL account.

## Recording (`recording` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Manual recording link | manual | Attach recording URL, media metadata, recording status to an episode | none | — | Episode → Recording |
| Riverside | planned (interface + mock) | Pull recordings, tracks, transcripts automatically into the episode | Riverside API key (Business plan) | riverside.fm → Settings → API | Settings → Integrations → Riverside |

## Editing

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Manual (any editor) | manual | Record edited media URLs and production status | none | — | Episode → Production |
| Descript | planned | Push raw media, pull edited exports and transcripts | Descript API access (when available) | descript.com | Settings → Integrations → Descript |

## Transcription (`transcription` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Paste / upload (TXT, SRT, VTT, JSON) | manual (real parser) | Transcript with segments, timestamps, speakers, language | none | — | Episode → Transcript |
| Transcription API (e.g. Deepgram, AssemblyAI, Whisper via provider) | planned (interface + mock) | Automatic transcription from uploaded/linked media | provider API key | provider console | Settings → Integrations → Transcription |

## Hosting / RSS (`hosting` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Manual hosting record | manual | Store feed URL, external episode URL/ID, distribution state | none | — | Podcast → Hosting; Episode → Publishing |
| Transistor | planned (interface + mock) | Create/publish episodes, read feed and download analytics | Transistor API key | dashboard.transistor.fm → Your Account → API | Settings → Integrations → Transistor |

## Publishing / distribution (`social_publishing` and destinations)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Mock publisher | mock | Full publishing workflow (scheduled → published) for local testing | none | built in | default locally |
| YouTube | planned (manual now) | Upload video, set metadata, read views | Google OAuth client (YouTube Data API) | console.cloud.google.com → APIs → YouTube Data API v3 → OAuth credentials | Settings → Integrations → YouTube |
| Spotify (for Creators) | planned (manual now) | Track distribution status; analytics when API allows | Spotify account / API | podcasters.spotify.com | Settings → Integrations → Spotify |
| Apple Podcasts | planned (manual now) | Track distribution status; Apple Podcasts Connect analytics later | Apple Podcasts Connect access | podcastsconnect.apple.com | Settings → Integrations → Apple |
| Blotato | planned (interface + mock) | Push clips/posts to multiple social networks | Blotato API key | blotato.com → API | Settings → Integrations → Blotato |

In V1 social content is produced as export-ready assets in the Content Library; the
user posts it and marks the destination "published" with the URL.

## Research / data (`research` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Manual URLs + notes + AI analysis | manual + AI | Sourced guest briefs from links you paste | none (AI key for analysis) | — | Guest → Research |
| Apify | planned (interface + mock) | Automated web/social scraping for guest discovery and research | Apify API token | console.apify.com → Settings → Integrations | Settings → Integrations → Apify |

## Calendar (`calendar` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Manual booking | manual | Record recording date/time and booking link on the booking | none | — | Guest → Booking |
| Google Calendar | planned (interface + mock) | Create recording events, reminders, guest invites | Google OAuth client (Calendar API) | console.cloud.google.com | Settings → Integrations → Google Calendar |

## Email (`email` capability)

| Provider | V1 status | What connecting enables | Credential | Where to get it | Config field |
|---|---|---|---|---|---|
| Copy-to-clipboard / mailto | manual | Approved outreach drafts sent from the user's own mail client; status tracked in app | none | — | Outreach → Send manually |
| Gmail | planned (interface + mock) | Send approved outreach from the user's Gmail, log replies | Google OAuth client (Gmail API) | console.cloud.google.com | Settings → Integrations → Gmail |

Per the brief, there is no shared cold-email identity. Each customer's sending identity
is their own connection (dedicated sender/domain tracking is V2).

## Analytics (`analytics` capability)

| Provider | V1 status | What connecting enables | Credential | Config field |
|---|---|---|---|---|
| Business impact (in-app) | real | Relationships, follow-ups, opportunities, clients, revenue influenced (manually attributed, auditable) | none | built in |
| Media analytics (hosting/YouTube/Spotify) | planned | Downloads, views, watch time per destination | via the destination's connection | via each integration |

Unconnected media analytics display "Not connected" with a connect action. Never numbers.

## What the founder needs to supply
Nothing below blocks local use; each item switches one piece from mock/manual to real.

**1. Supabase project (needed for real login + persistence beyond local Postgres)**
- Account/API needed: Supabase project (free tier)
- Why: database, authentication, file storage for the app
- Where to get: supabase.com → New project → Settings → API
- Env/config field: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- What it unlocks: real sign-up/login, persistent data, storage; deployment

**2. Credential encryption key**
- Account/API needed: none (generate locally: `openssl rand -base64 32`)
- Why: encrypts customers' AI/provider keys at rest
- Where to get: generate once; store in a password manager and Vercel env
- Env/config field: `CREDENTIAL_ENCRYPTION_KEY`
- What it unlocks: saving any provider connection in Settings

**3. An AI provider key (optional; customers bring their own, this is your own workspace's)**
- Account/API needed: OpenAI, Anthropic or Google Gemini API key (or Ollama locally for free)
- Why: run the AI capabilities in your own workspace; test real structured output
- Where to get: platform.openai.com / console.anthropic.com / aistudio.google.com
- Env/config field: Settings → AI in the app (preferred), or `AI_DEFAULT_PROVIDER`, `AI_DEFAULT_API_KEY`, `AI_DEFAULT_MODEL`, `AI_DEFAULT_BASE_URL` for development
- What it unlocks: strategy, guest research, outreach drafts, interview briefs, transcript analysis, show notes, quotes, content ideas, Opportunity Engine, Podcast Brain synthesis, follow-up suggestions

**4. GoHighLevel private integration token + Location ID**
- Account/API needed: Funneling Media's GHL agency account (already owned)
- Why: platform rule: customers identified by email + GHL contact; lifecycle tags
- Where to get: GHL sub-account → Settings → Private Integrations → create token with contacts read/write scopes; Location ID from Settings → Business Profile
- Env/config field: `GHL_API_KEY`, `GHL_LOCATION_ID`
- What it unlocks: real contact upsert on signup and `podcasting-gg:*` tags; without it the mock logs what would be sent

**5. Riverside API key (later)**
- Account/API needed: Riverside Business plan
- Why: pull recordings/transcripts automatically
- Where to get: riverside.fm → Settings → API
- Env/config field: Settings → Integrations → Riverside
- What it unlocks: recording adapter goes from manual to real

**6. Transistor API key (later)**
- Account/API needed: Transistor account
- Why: publish episodes to RSS and read download analytics
- Where to get: dashboard.transistor.fm → Your Account → API
- Env/config field: Settings → Integrations → Transistor
- What it unlocks: hosting adapter goes from manual to real

**7. Google Cloud OAuth client (later; one client covers YouTube, Calendar, Gmail)**
- Account/API needed: Google Cloud project with YouTube Data API v3, Calendar API, Gmail API enabled and an OAuth consent screen
- Why: customers connect their own Google accounts
- Where to get: console.cloud.google.com → APIs & Services → Credentials
- Env/config field: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (to be added to `.env.example` when built)
- What it unlocks: YouTube upload/analytics, calendar events, sending outreach from Gmail

**8. Apify token, Blotato key, Descript access, transcription provider key (later)**
- Why: automated research, multi-network social publishing, editing pipeline, automatic transcription
- Where to get: each provider's console (links in the tables above)
- Env/config field: Settings → Integrations → provider
- What it unlocks: those adapters go from planned/mock to real
