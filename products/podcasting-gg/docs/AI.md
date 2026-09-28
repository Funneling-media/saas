# AI

**Plain-English summary.** Customers plug in their own AI account (OpenAI, Anthropic,
Google, and others); we never resell AI or charge credits in V1. The app asks the AI for
specific jobs ("find the business opportunities in this transcript") and demands a
strict, checkable answer format. Everything AI produces is a draft the user can edit;
the app records what was generated versus edited and never overwrites a person's
changes. If no AI is connected, AI buttons explain how to connect one and everything
else keeps working.

## Bring-your-own-AI (BYO-AI)
- Each workspace connects one or more providers in **Settings → AI** and picks a default
  model. Keys are encrypted at rest (see Credential storage) and used only on the server.
- `AI_DEFAULT_*` env vars are a **development fallback** only; production workspaces use
  their own connection.
- No feature imports a vendor SDK. Features call capability functions; the router picks
  the provider underneath (ADR-004).

## Providers and adapter families
Three adapter implementations cover every provider (`app/src/adapters/ai/`):

| Provider | Adapter family | Notes |
|---|---|---|
| OpenAI | `openai-compatible` | Default base URL `https://api.openai.com/v1` |
| OpenRouter | `openai-compatible` | Base URL `https://openrouter.ai/api/v1`; one key, many models |
| Groq | `openai-compatible` | Fast open models |
| DeepSeek | `openai-compatible` | |
| xAI (Grok) | `openai-compatible` | |
| Ollama | `openai-compatible` | Local; base URL `http://localhost:11434/v1`, no key |
| LM Studio | `openai-compatible` | Local; base URL `http://localhost:1234/v1`, no key |
| Anthropic | `anthropic` | Messages API |
| Google Gemini | `gemini` | Generative Language API |

Adding a provider that speaks the OpenAI chat format is a registry entry (name, base
URL, default models), not new code. V1 status per provider: [`INTEGRATIONS.md`](INTEGRATIONS.md).

## Flow
`User action → Capability → AI service → Provider router → Provider adapter → Model`.
Long capabilities run as background jobs (`ai_extract`, `guest_research`) and the UI
shows queued / processing / complete / failed / retry.

## Capability catalog (`app/src/ai/capabilities/`)

| Capability | Input context | Structured output (Zod) | Runs as |
|---|---|---|---|
| `generatePodcastStrategy` | founder, business, podcast, goals, ideal guest | positioning, promise, target listener, content pillars, guest archetypes, interview philosophy, CTA, distribution plan, 20-episode roadmap, success metrics | job |
| `researchGuest` | guest record, user-supplied URLs/notes, host profile | bio, role, expertise, accomplishments, recent work, themes, overlap with host, hooks, questions, topics to avoid, `sources[]`; each fact flagged `sourced` or `ai_suggested` | job |
| `generateInterviewQuestions` | guest research, strategy, episode objective, past questions (anti-repetition) | opening, themes, questions with follow-ups, stories to explore, CTA | inline/job |
| `generateOutreach` | guest, research, brand voice, template, channel | subject, body, personalization notes; **saved as draft requiring approval** | inline |
| `summarizeTranscript` | transcript segments (chunked), episode | summary, chapters with timestamps, key takeaways, language | job |
| `createShowNotes` | transcript summary, brand kit, CTA | title options, description, show notes, keywords, chapters | job |
| `extractQuotes` | transcript segments | quotes with speaker, timestamp, why it matters, clip-worthiness | job |
| `generateContentIdeas` | transcript summary, quotes, brand voice, content pillars | LinkedIn posts, X posts, newsletter angle, clip briefs, hooks, thumbnail concepts | job |
| `extractOpportunities` | transcript segments, guest, relationships | opportunities: type (enum), summary, exact excerpt, timestamp, person, confidence 0–1, potential value, suggested next action | job |
| `queryPodcastBrain` | retrieved `knowledge_chunks` (lexical now, vector later) + question | answer with citations `{episode_id, chunk_id, excerpt}`; refuses to answer without retrieved sources | inline |
| `suggestFollowUps` | relationships, last interaction, open opportunities, promises detected | follow-up suggestions with reason and due date | job (nightly) |

Every capability declares: a Zod output schema, the context layers it needs, a token
budget, and whether its result needs approval before any external effect.

## Structured output, validation, retries
- The prompt states the JSON schema; adapters use native JSON/tool modes where the
  provider supports them.
- Response → `schema.safeParse`. On failure: one repair attempt (re-send with the
  validation errors), then a fresh attempt with a stricter prompt; max 3 attempts.
- Provider errors: `missing_credentials`, `invalid_credentials` (→ `reauth_required`),
  `rate_limited` / `quota_exhausted` (retry with backoff, then fail with a clear
  message), `timeout` (60s inline, 5 min in jobs), `malformed_response`, `network`.
- Nothing partial is written: a capability result is stored only when it validates.
- Provenance stored with every result: provider, model, capability version, prompt
  hash, token usage, duration.

## Context layers (structured, not one giant prompt)
Each capability assembles only the layers it declares, each capped in size:
`founder_profile`, `business_profile`, `podcast_strategy`, `brand_voice` (tone,
prohibited phrases, example content), `guest`, `episode`, `transcript_retrieval`
(relevant chunks, never the full transcript unless short), `relationship_history`,
`current_task`. Transcripts are chunked by segments; long capabilities map over chunks
and reduce. Language metadata is passed so non-English transcripts are handled
explicitly.

## Provenance and manual override
Generated content rows carry `generated_by` (`ai` | `user` | `import`), `generation_id`
(FK to the AI run), `edited_at`, `edited_by`. Rules:
- Users can edit everything AI produces.
- Re-running a capability never overwrites a row with `edited_at` set; it creates a new
  suggestion the user can compare and accept.
- AI inferences (opportunities, scores) always display the evidence: excerpt, timestamp,
  confidence, and the inputs behind any score. Users Accept / Dismiss / Edit / Convert to task.

## Failure UX rules
Every AI error the user sees answers three things: **what happened**, **what was
preserved** (the transcript is saved; the draft is intact), **what to do next**
(reconnect provider, retry, switch model). Retry is always offered. Never show raw
provider payloads or stack traces.

## Credential storage
- Stored in `provider_connections.credentials_encrypted`, AES-256-GCM with
  `CREDENTIAL_ENCRYPTION_KEY` (`lib/crypto.ts`); IV and auth tag stored alongside.
- Decrypted only inside the adapter on the server. The browser only ever receives a
  masked hint (`…last4`) and the connection status. Keys are never logged.
- Rotating `CREDENTIAL_ENCRYPTION_KEY` requires a re-encrypt script (V2); document the
  key in the deployment secrets manager, never in the repo.

## When no provider is configured
- Onboarding, strategy, guests, episodes, transcripts, tasks, CRM, search: all work.
- AI actions render disabled with "Connect an AI provider to enable this" and a link
  to Settings → AI; capability jobs are not enqueued.
- Podcast Brain falls back to lexical search results with citations, no synthesis.
- Locally, the `mock` AI adapter can be selected to demo every capability with
  deterministic sample output clearly labeled "Mock".
