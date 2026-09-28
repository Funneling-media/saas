-- Reference data: the nine-stage webinar-engine v2 scope template, version 1.
-- Contains deliverable structure only: no prices, revision terms or turnaround promises.
-- Those come from each client's signed agreement at activation time.
-- To change the template, add a new migration inserting version 2; existing client
-- snapshots are never modified.

insert into public.scope_templates (code, version, name, definition) values (
  'webinar-engine-v2',
  1,
  'Webinar engine v2 (nine serial stages)',
  $json$
  {
    "execution": "serial",
    "packages": [
      {
        "key": "brand-direction",
        "position": 1,
        "title": "Brand direction and copy angles",
        "depends_on": [],
        "deliverables": [
          "First-draft branding deck/PDF",
          "Three-page copy-and-angle review deck/PDF",
          "Brand voice, visual direction, colors, fonts, audience language, offer angle, proof/claim map, key exclusions",
          "Short walkthrough video with an approve/revise action"
        ],
        "acceptance": ["Reviewed source links", "Editable source", "Review export", "Approval evidence"]
      },
      {
        "key": "offer-architecture",
        "position": 2,
        "title": "Offer and funnel architecture",
        "depends_on": ["brand-direction"],
        "deliverables": [
          "Client-customizable offer structure",
          "Frontend, free/VIP, order bump, upsell, downsell, subscription and thank-you path recommendations",
          "Funnel map with pricing/terms placeholders until approved",
          "Responsibilities, implementation notes, claim/scope checks"
        ],
        "acceptance": ["Pricing and terms remain placeholders until approved", "Claim/scope check recorded"]
      },
      {
        "key": "image-ads",
        "position": 3,
        "title": "Image ads",
        "depends_on": ["offer-architecture"],
        "quantity": 20,
        "deliverables": [
          "Twenty meaningfully distinct concepts (not resizes)",
          "Hooks, body copy, CTA, visual direction",
          "Required platform sizes, editable masters, review exports",
          "Source/proof references and claim checks"
        ],
        "acceptance": ["Editable masters", "Platform exports", "Claim check per concept"]
      },
      {
        "key": "video-ads",
        "position": 4,
        "title": "Video ads",
        "depends_on": ["image-ads"],
        "quantity": 10,
        "deliverables": [
          "Ten concepts with hooks, scripts/storyboards, CTA",
          "Reviewed MP4 exports and editable/source files where available",
          "Captions/subtitles per approved policy",
          "Claim/source checks"
        ],
        "acceptance": ["Review MP4s", "Source files where the tool permits", "Claim check per concept"]
      },
      {
        "key": "landing-pages",
        "position": 5,
        "title": "Two frontend landing-page versions and GHL handoff",
        "depends_on": ["video-ads"],
        "quantity": 2,
        "deliverables": [
          "Two materially different landing-page variants (design and copy)",
          "Responsive HTML/CSS or controlled ChatGPT Sites build suitable for GHL opt-in",
          "Handoff to the GHL order/VIP/bump/upsell/downsell/thank-you template"
        ],
        "acceptance": ["Mobile, CTA, form, consent, speed, accessibility, tracking and cross-browser QA"]
      },
      {
        "key": "webinar-copy",
        "position": 6,
        "title": "Webinar copy, pre-event material and follow-up",
        "depends_on": ["landing-pages"],
        "deliverables": [
          "Registration and offer-page copy",
          "Email/SMS reminders, pre-event material, attendance/no-show/replay and follow-up sequences",
          "Case-study/proof briefs",
          "Workflow specification: trigger, timing, channel, consent, suppression, exit, owner, fallback"
        ],
        "acceptance": ["Every sequence has consent, suppression and exit conditions"]
      },
      {
        "key": "webinar-deck",
        "position": 7,
        "title": "Kimi webinar presentation",
        "depends_on": ["webinar-copy"],
        "deliverables": [
          "Webinar slide deck from the approved Kimi framework",
          "Editable presentation, review PDF, presenter notes",
          "Offer section, proof placement, run-of-show notes"
        ],
        "acceptance": ["No invented proof, awards, testimonials, pricing, guarantees or results"]
      },
      {
        "key": "live-automation",
        "position": 8,
        "title": "Live webinar technology and automations",
        "depends_on": ["webinar-deck"],
        "deliverables": [
          "Registration, reminder, attendance, replay, offer/CTA and follow-up automation",
          "Explicitly approved live features only",
          "Test events, consent/suppression, failure behavior, owner, rollback"
        ],
        "acceptance": ["End-to-end QA", "AI assistants disclose they are AI and escalate to a human"]
      },
      {
        "key": "launch-handoff",
        "position": 9,
        "title": "Launch handoff, access, feedback and learning capture",
        "depends_on": ["live-automation"],
        "deliverables": [
          "Final link/file inventory, editable sources, ownership and permissions",
          "Implementation instructions, tested URLs, launch checklist",
          "Feedback form, proof/rights consent, future-webinar learning log"
        ],
        "acceptance": ["Every link tested", "Rights consent before testimonial use"]
      }
    ]
  }
  $json$::jsonb
);
