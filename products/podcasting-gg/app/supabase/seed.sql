-- seed.sql
-- Demo data for Podcasting.gg. Re-runnable: fixed UUIDs + on conflict do nothing.
--
-- Demo login: demo@podcasting.gg / demo1234
--
-- UUID map (all v4-shaped, fixed):
--   00000000-0000-0000-0000-000000000001  demo user (Alex Rivera)
--   10000000-...-000000000001             organization  Acme Advisory
--   20000000-...-000000000001             workspace     Acme Advisory
--   30000000-...-000000000001             podcast       The Founder Growth Show
--   40000000-...-0000000000NN             contacts
--   50000000-...-0000000000NN             guests
--   60000000-...-0000000000NN             episodes
--   70000000-...-000000000001             transcript (episode 7)
--   71000000-...-0000000000NN             transcript segments
--   80000000-...-0000000000NN             opportunities
--   81000000-...-0000000000NN             tasks

-- ---------------------------------------------------------------------------
-- Auth user (profile is created by the handle_new_user trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@podcasting.gg',
  crypt('demo1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Alex Rivera"}'::jsonb,
  now(), now(),
  '', '', '', ''
) on conflict (id) do nothing;

update public.profiles
   set onboarding_completed_at = coalesce(onboarding_completed_at, now() - interval '21 days')
 where id = '00000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Tenant: org + workspace (creator becomes owner via trigger)
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, created_by, created_at)
values ('10000000-0000-4000-8000-000000000001', 'Acme Advisory', 'acme-advisory',
        '00000000-0000-0000-0000-000000000001', now() - interval '21 days')
on conflict (id) do nothing;

insert into public.workspaces (id, organization_id, name, slug, settings, created_at)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
        'Acme Advisory', 'acme-advisory',
        '{"timezone":"America/Chicago","milestones":{"launch":1,"consistent":5,"authority":10,"network_builder":15,"top_1_percent":20}}'::jsonb,
        now() - interval '21 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Founder profile, brand kit
-- ---------------------------------------------------------------------------
insert into public.founder_profiles (
  id, organization_id, workspace_id, role, bio, expertise, story, credibility, links,
  business_name, website, industry, business_model, offer, price_range, target_market,
  ideal_customer, pain_points, differentiation, desired_cta, goals, ideal_guest, guest_positioning
) values (
  '33000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Founder & Managing Partner',
  $q$Alex Rivera runs Acme Advisory, a growth advisory firm that helps founder-led B2B services companies between $5M and $50M build repeatable sales systems without hiring a sales army.$q$,
  array['founder-led sales','go-to-market strategy','B2B services','pricing','referral systems'],
  $q$Alex spent eleven years scaling a regional IT services firm from $3M to $38M as COO before selling to a private equity group in 2021. Acme Advisory was founded the following year after a dozen former peers asked for the same playbook.$q$,
  $q$Former COO of a $38M services company; advised 40+ founder-led firms; guest lecturer on founder-led sales at Ohio State Fisher College of Business.$q$,
  '{"linkedin":"https://www.linkedin.com/in/alexrivera-acme","website":"https://acmeadvisory.example.com"}'::jsonb,
  'Acme Advisory', 'https://acmeadvisory.example.com', 'Professional services / growth advisory',
  'Retainer advisory plus quarterly strategy intensives',
  'Founder-Led Growth System: a 90-day engagement that installs a referral engine, an outbound playbook and a pricing model',
  '$8,000 to $15,000 per month', 'Founder-led B2B services companies in the US Midwest, $5M to $50M revenue',
  'A founder or CEO who still closes most deals personally and knows that is the bottleneck',
  'Revenue depends on the founder; outbound has never worked; pricing has not changed in years; referrals are lucky rather than engineered',
  'Operator background, not agency background. Every recommendation was run in a real company first.',
  'Book a 30-minute growth diagnostic',
  array['Land 6 new advisory clients from the podcast in 12 months','Become the recognized voice on founder-led sales in the Midwest','Build a network of 100 operator relationships'],
  '{"titles":["Founder","CEO","COO","Managing Partner"],"company_size":"$5M-$100M revenue","industries":["staffing","logistics","IT services","healthcare services","professional services"],"traits":["built something from scratch","willing to share numbers","has an opinion"]}'::jsonb,
  '{"topics":["founder-led sales","scaling services firms without VC","pricing for services"],"one_liner":"Former $38M services COO who now installs sales systems for founder-led firms","proof_points":["11 years operating","40+ firms advised","PE exit in 2021"]}'::jsonb
) on conflict (id) do nothing;

insert into public.brand_kits (
  id, organization_id, workspace_id, logo_url, colors, fonts, tone, voice_guidelines,
  prohibited_phrases, cta, url, social_handles
) values (
  '32000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  null,
  '{"primary":"#0F172A","accent":"#F59E0B","background":"#FFFFFF","muted":"#64748B"}'::jsonb,
  '{"heading":"Inter","body":"Inter"}'::jsonb,
  'Direct, warm, operator-to-operator. Confident without hype.',
  $q$Write like a peer who has done the work. Use specific numbers. Prefer short sentences. Never promise outcomes we cannot control. Avoid startup jargon; our audience runs staffing firms and logistics companies, not SaaS.$q$,
  array['crush it','10x','game-changer','unlock','synergy','hustle'],
  'Book a 30-minute growth diagnostic at acmeadvisory.example.com/diagnostic',
  'https://acmeadvisory.example.com',
  '{"linkedin":"acme-advisory","youtube":"@foundergrowthshow","x":"@alexrivera_acme"}'::jsonb
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Podcast + strategy
-- ---------------------------------------------------------------------------
insert into public.podcasts (
  id, organization_id, workspace_id, name, slug, description, format, medium, category,
  feed_url, artwork_url, cadence, target_episode_count, mode_host, mode_guest, created_at
) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'The Founder Growth Show', 'the-founder-growth-show',
  'Candid conversations with founders who scaled B2B services companies past $10M, about what actually moved revenue.',
  'interview', 'video', 'Business / Entrepreneurship',
  'https://feeds.example.com/founder-growth-show', null,
  'weekly', 20, true, true, now() - interval '20 days'
) on conflict (id) do nothing;

insert into public.podcast_strategies (
  id, organization_id, workspace_id, podcast_id, positioning, show_promise, target_listener,
  business_objective, content_pillars, ideal_guest_archetypes, interview_philosophy, cta,
  distribution_plan, episode_roadmap, relationship_strategy, success_metrics, generated_by, edited_at
) values (
  '31000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'The only show where Midwest services founders share real numbers about how they grew past $10M.',
  'Every episode gives you one growth mechanism you can copy on Monday morning.',
  'Founders and CEOs of $5M-$50M B2B services firms who still close deals themselves.',
  'Generate qualified advisory conversations with founders who match the Acme ICP, and build a referral network of operators.',
  '[{"name":"Founder-led sales","description":"How founders sell before they have a sales team"},{"name":"Pricing and packaging","description":"Moving from hourly to outcomes"},{"name":"Referral engines","description":"Turning clients and candidates into a pipeline"},{"name":"Scaling without capital","description":"Bootstrapped growth past $10M"}]'::jsonb,
  '[{"name":"The Bootstrapped Operator","description":"Built a $10M+ services firm from cash flow","why":"Closest to ICP; also the ideal client"},{"name":"The Reformed Vendor","description":"Repositioned from vendor to advisor","why":"Great stories, strong quotes"},{"name":"The Capital Allocator","description":"Search fund or PE operator who bought services firms","why":"Introductions to founders preparing for exit"}]'::jsonb,
  'Do the homework, ask about the moment things changed, always get a number, and close with the reversal question.',
  'Book a 30-minute growth diagnostic',
  'Full episode to YouTube and RSS on Tuesdays; three clips to LinkedIn across the week; weekly email with one takeaway; guest receives a sharing kit the morning of release.',
  '[{"episode":1,"theme":"Why founder-led sales is a system, not a personality"},{"episode":2,"theme":"Pricing: the first client who said no"},{"episode":3,"theme":"Referral engine teardown"},{"episode":7,"theme":"Scaling a staffing firm to $40M without capital"},{"episode":10,"theme":"Healthcare services: selling to procurement"},{"episode":20,"theme":"What 20 founders taught me about growth"}]'::jsonb,
  'Every guest gets a follow-up within 48 hours, an introduction offer within two weeks, and a check-in at 90 days. Track every introduction made in both directions.',
  '[{"metric":"Advisory conversations booked from show","target":12,"period":"12 months"},{"metric":"Episodes complete","target":20,"period":"12 months"},{"metric":"Introductions made","target":40,"period":"12 months"},{"metric":"Email list","target":5000,"period":"12 months"}]'::jsonb,
  'ai', now() - interval '18 days'
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
insert into public.contacts (
  id, organization_id, workspace_id, full_name, first_name, last_name, email, phone, title,
  company, bio, website, location, social_urls, expertise, audience, tags, source, notes
) values
(
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Elena Vasquez', 'Elena', 'Vasquez', 'elena@northwindstaffing.example.com', '+1 614 555 0142',
  'Founder & CEO', 'Northwind Staffing Group',
  $q$Founder of Northwind Staffing Group, a $40M Midwest staffing and workforce advisory firm built without outside capital. Writes a weekly note read by 9,000 operators.$q$,
  'https://northwindstaffing.example.com', 'Columbus, OH',
  '{"linkedin":"https://www.linkedin.com/in/elenavasquez-northwind"}'::jsonb,
  array['staffing','workforce planning','bootstrapping','founder-led content'],
  '9,000 operators via weekly newsletter; regular speaker at staffing industry events',
  array['guest','ICP','midwest'], 'referral',
  'Introduced by Sam Whitaker (episode 3). Extremely well prepared; brings numbers.'
),
(
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Dana Whitfield', 'Dana', 'Whitfield', 'dana@northwindstaffing.example.com', null,
  'Managing Partner, Northwind Insights', 'Northwind Staffing Group',
  $q$Runs Northwind Insights, the advisory arm of Northwind Staffing. Ten years at a search fund before joining Elena Vasquez as partner.$q$,
  null, 'Columbus, OH',
  '{"linkedin":"https://www.linkedin.com/in/danawhitfield"}'::jsonb,
  array['capital allocation','search funds','advisory services'],
  null, array['introduction','prospect'], 'episode_mention',
  'Mentioned by Elena Vasquez in episode 7. Elena offered to make the introduction.'
),
(
  '40000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Marcus Chen', 'Marcus', 'Chen', 'marcus@brightlinelogistics.example.com', '+1 312 555 0188',
  'Founder & CEO', 'Brightline Logistics',
  $q$Founded Brightline Logistics in 2015; grew it to 140 employees and $62M revenue serving mid-market manufacturers in Illinois and Indiana.$q$,
  'https://brightlinelogistics.example.com', 'Chicago, IL',
  '{"linkedin":"https://www.linkedin.com/in/marcuschen-brightline","x":"https://x.com/marcusbrightline"}'::jsonb,
  array['logistics','operations','pricing','freight brokerage'],
  'Active on LinkedIn with about 22,000 followers',
  array['guest','ICP'], 'linkedin',
  'Replied within a day of outreach. Wants to talk about the pricing overhaul that nearly killed the company in 2020.'
),
(
  '40000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Priya Natarajan', 'Priya', 'Natarajan', 'priya.natarajan@cobalthealth.example.com', null,
  'VP Revenue', 'Cobalt Health Systems',
  $q$Leads revenue at Cobalt Health Systems, a 300-person outsourced revenue cycle company. Previously built the sales team at a physician staffing firm.$q$,
  'https://cobalthealth.example.com', 'Indianapolis, IN',
  '{"linkedin":"https://www.linkedin.com/in/priyanatarajan"}'::jsonb,
  array['healthcare services','enterprise sales','procurement'],
  'Speaks at HFMA regional events',
  array['guest'], 'research',
  'Fit for the healthcare services episode. Not a founder, but runs revenue at a founder-led company.'
),
(
  '40000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Tom Okafor', 'Tom', 'Okafor', 'tom@operatorsweekly.example.com', null,
  'Host', 'Operators Weekly',
  $q$Hosts Operators Weekly, a podcast for owners of blue-collar and services businesses with roughly 25,000 downloads per episode.$q$,
  'https://operatorsweekly.example.com', 'Milwaukee, WI',
  '{"linkedin":"https://www.linkedin.com/in/tomokafor","youtube":"https://youtube.com/@operatorsweekly"}'::jsonb,
  array['podcasting','small business','operations'],
  '25,000 downloads per episode; audience skews to owners of $2M-$20M companies',
  array['host','guest-mode'], 'research',
  'Target show for Alex to appear on. Tom has interviewed two former Acme clients.'
),
(
  '40000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'Rachel Lindqvist', 'Rachel', 'Lindqvist', 'rachel@halvorsenventures.example.com', null,
  'Partner', 'Halvorsen Ventures',
  $q$Partner at Halvorsen Ventures, a Minneapolis firm that acquires and grows founder-led services companies. Sits on the boards of six portfolio companies.$q$,
  'https://halvorsenventures.example.com', 'Minneapolis, MN',
  '{"linkedin":"https://www.linkedin.com/in/rachellindqvist"}'::jsonb,
  array['acquisitions','services businesses','board governance','exit planning'],
  'Portfolio of six founder-led services companies',
  array['guest','referral-source'], 'referral',
  'Recorded episode 8. Very interested in referring portfolio founders who need sales systems.'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Relationships + interactions
-- ---------------------------------------------------------------------------
insert into public.relationships (
  id, organization_id, workspace_id, contact_id, category, strength,
  last_interaction_at, next_follow_up_at, notes
) values
('41000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', 'guest', 82, now() - interval '3 days', current_date, 'Strong rapport. Four opportunities detected in episode 7.'),
('41000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', 'prospect', 60, now() - interval '3 days', current_date + 7, 'Asked on air for help rebuilding outbound. Qualifies for the Founder-Led Growth System.'),
('41000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000002', 'introducer', 20, null, current_date + 3, 'Awaiting introduction from Elena.'),
('41000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000003', 'guest', 55, now() - interval '2 days', current_date + 5, 'Booked for episode 9.'),
('41000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000004', 'guest', 25, null, current_date + 2, 'Outreach drafted, awaiting approval.'),
('41000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000005', 'host', 30, now() - interval '9 days', current_date + 7, 'Warm via two former clients. Pitch Alex as a guest.'),
('41000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000006', 'referral_source', 70, now() - interval '5 days', current_date + 14, 'Offered to introduce two portfolio founders after episode 8 airs.')
on conflict (id) do nothing;

insert into public.interactions (id, organization_id, workspace_id, contact_id, kind, occurred_at, summary, metadata) values
('42000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', 'recording', now() - interval '12 days', 'Recorded episode 7 (58 minutes).', '{"episode_number":7}'::jsonb),
('42000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', 'email', now() - interval '3 days', 'Sent sharing kit and thank-you note. Elena replied with two clip suggestions.', '{}'::jsonb),
('42000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000003', 'email', now() - interval '2 days', 'Confirmed recording slot for episode 9 and shared prep questions.', '{}'::jsonb),
('42000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000006', 'recording', now() - interval '5 days', 'Recorded episode 8 (51 minutes).', '{"episode_number":8}'::jsonb),
('42000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000005', 'linkedin', now() - interval '9 days', 'Commented on Tom''s post about founder-led sales; he replied.', '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Guests (pipeline)
-- ---------------------------------------------------------------------------
insert into public.guests (
  id, organization_id, workspace_id, contact_id, podcast_id, stage, fit_score,
  fit_score_breakdown, source, approved_at, consent, notes
) values
('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'follow_up', 94,
 '{"icp_match":30,"audience":22,"story":24,"reachability":18}'::jsonb, 'referral', now() - interval '19 days',
 '{"release_accepted":true}'::jsonb, 'Episode 7 published. Follow-up on four opportunities in progress.'),
('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'production', 88,
 '{"icp_match":22,"audience":20,"story":26,"reachability":20}'::jsonb, 'referral', now() - interval '16 days',
 '{"release_accepted":true}'::jsonb, 'Episode 8 recorded, in editing.'),
('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'booked', 91,
 '{"icp_match":30,"audience":18,"story":25,"reachability":18}'::jsonb, 'linkedin', now() - interval '10 days',
 '{}'::jsonb, 'Recording scheduled for next week.'),
('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'researched', 76,
 '{"icp_match":18,"audience":16,"story":24,"reachability":18}'::jsonb, 'research', null,
 '{}'::jsonb, 'Research complete; outreach draft awaiting approval.'),
('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'prospect', null,
 '{}'::jsonb, 'episode_mention', null, '{}'::jsonb, 'Candidate for the Capital Allocator archetype once introduced.')
on conflict (id) do nothing;

insert into public.guest_research (id, organization_id, workspace_id, guest_id, summary, facts, suggestions, sources, generated_by) values
('51000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000004',
 'Priya Natarajan built Cobalt Health Systems'' outbound motion into hospital procurement, taking the company from 40 to 300 employees. She speaks often about selling to committees and has strong opinions on RFP-driven sales.',
 '["Joined Cobalt in 2019 as first sales hire; now VP Revenue","Previously built sales team at a physician staffing firm acquired in 2018","Regular HFMA regional speaker on revenue cycle outsourcing","Cobalt is founder-led (CEO Naomi Feld) and bootstrapped"]'::jsonb,
 '["Ask how selling to a hospital procurement committee differs from selling to a founder","Ask about the first enterprise deal that almost did not close","Reference her HFMA talk on RFP avoidance"]'::jsonb,
 '[{"title":"Cobalt Health Systems leadership page","url":"https://cobalthealth.example.com/leadership"},{"title":"HFMA Indiana 2025 agenda","url":"https://hfma.example.org/indiana-2025"}]'::jsonb,
 'ai'),
('51000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000003',
 'Marcus Chen founded Brightline Logistics in 2015 and rebuilt its pricing model in 2020 after a near-fatal cash crunch. He is outspoken about freight brokerage margins and hiring operators over salespeople.',
 '["Brightline: 140 employees, ~$62M revenue","2020 pricing overhaul moved from per-load to committed capacity contracts","22,000 LinkedIn followers; posts weekly about operations"]'::jsonb,
 '["Open with the 2020 cash crunch","Get the exact margin before and after the pricing change","Ask what he would tell a $10M broker today"]'::jsonb,
 '[{"title":"Brightline Logistics about page","url":"https://brightlinelogistics.example.com/about"}]'::jsonb,
 'ai')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Outreach
-- ---------------------------------------------------------------------------
insert into public.outreach_messages (
  id, organization_id, workspace_id, guest_id, contact_id, channel, direction, subject, body, status, sent_at, generated_by
) values
('52000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'email', 'outbound',
 'Selling to hospital procurement, on The Founder Growth Show',
 $q$Hi Priya,

I run The Founder Growth Show, a weekly conversation with people who grew B2B services companies past $10M. Your HFMA talk on avoiding RFP-driven deals is exactly the kind of practical thinking our audience of founders wants more of.

Would you be open to a 45-minute recorded conversation about how Cobalt built an outbound motion into hospital procurement? We publish on YouTube and audio, and you would get a full sharing kit the morning of release.

Alex Rivera
Acme Advisory$q$,
 'pending_approval', null, 'ai'),
('52000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'linkedin', 'outbound',
 null,
 $q$Marcus, your post on committed-capacity pricing got forwarded to me twice this week. I host The Founder Growth Show and would love to have you walk through the 2020 pricing overhaul on the record. 45 minutes, remote, your call on timing.$q$,
 'replied', now() - interval '11 days', 'user'),
('52000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'linkedin', 'inbound',
 null,
 $q$Happy to. Send me a couple of slots for the week after next. Fair warning, I will bring the actual margin numbers.$q$,
 'replied', now() - interval '10 days', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Episodes (5 across lifecycle)
-- ---------------------------------------------------------------------------
insert into public.episodes (
  id, organization_id, workspace_id, podcast_id, title, description, episode_number, season, status,
  recording_date, publish_date, recording_url, show_notes, chapters, keywords, cta, thumbnail_url,
  video_url, audio_url, internal_notes, completion
) values
(
  '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'How Elena Vasquez Scaled Northwind Staffing to $40M Without Outside Capital',
  'Elena Vasquez lost her biggest client in 2017 and used it to reinvent Northwind Staffing from a vendor into an outcomes business. We cover the pricing shift that cost her half her sales team, why she turned down capital, the advisory arm with 3x margins, and why outbound is still her weak spot.',
  7, 1, 'complete',
  now() - interval '12 days', now() - interval '5 days', 'https://riverside.example.com/recordings/fgs-007',
  $q$Elena Vasquez built Northwind Staffing Group from a two-person recruiting desk to $40M in revenue without raising outside capital.

In this episode:
- The 2017 client loss that turned Northwind from a vendor into an outcomes business
- Why half the sales team left after the pricing change, and why that was the right trade
- Turning down capital and funding growth from cash flow
- Northwind Insights: the advisory arm running at 3x staffing margins
- Referrals and founder-led content as the real growth engine
- Elena's honest take on why outbound has never worked for them

Links:
- Northwind weekly note: northwindstaffing.com/notes
- Book a growth diagnostic: acmeadvisory.example.com/diagnostic$q$,
  '[{"title":"Losing the biggest client","start_ms":31000},{"title":"From placements to outcomes","start_ms":95000},{"title":"Saying no to capital","start_ms":132000},{"title":"Building Northwind Insights","start_ms":190000},{"title":"What actually drives revenue","start_ms":272000},{"title":"The outbound problem","start_ms":312000},{"title":"Speaking and what is next","start_ms":384000},{"title":"The reversal question","start_ms":506000}]'::jsonb,
  array['staffing','bootstrapping','pricing','founder-led sales','referrals'],
  'Book a 30-minute growth diagnostic',
  'https://cdn.example.com/fgs/007-thumb.jpg', 'https://youtube.com/watch?v=fgs007demo', 'https://cdn.example.com/fgs/007.mp3',
  'Best episode so far. Four opportunities detected. Prioritize the Dana introduction and the outbound engagement.',
  '{"recording":true,"long_form_published":true,"audio_published":true,"transcript":true,"show_notes":true,"title":true,"thumbnail":true,"distribution":true,"guest_follow_up":true}'::jsonb
),
(
  '60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Rachel Lindqvist on What Acquirers Actually Pay For in a Services Business',
  'Rachel Lindqvist has bought six founder-led services companies. She explains what kills a valuation, why founder-dependent sales is the first thing she prices in, and what she tells founders two years before they want to sell.',
  8, 1, 'editing',
  now() - interval '5 days', now() + interval '2 days', 'https://riverside.example.com/recordings/fgs-008',
  null,
  '[]'::jsonb,
  array['acquisitions','exit planning','valuation','services businesses'],
  'Book a 30-minute growth diagnostic', null, null, null,
  'Editor has the raw files. Need title decision and thumbnail by Friday.',
  '{"recording":true,"long_form_published":false,"audio_published":false,"transcript":false,"show_notes":false,"title":false,"thumbnail":false,"distribution":false,"guest_follow_up":false}'::jsonb
),
(
  '60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Marcus Chen: The Pricing Overhaul That Nearly Killed Brightline Logistics',
  'Marcus Chen moved Brightline Logistics from per-load pricing to committed-capacity contracts in the middle of 2020. Revenue dropped 20 percent before it tripled.',
  9, 1, 'booked',
  now() + interval '6 days', now() + interval '16 days', null,
  null, '[]'::jsonb,
  array['logistics','pricing','operations'],
  'Book a 30-minute growth diagnostic', null, null, null,
  'Recording booked. Interview brief drafted, needs review.',
  '{"recording":false}'::jsonb
),
(
  '60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Selling Services to Hospital Procurement with Priya Natarajan',
  'How Cobalt Health Systems built an outbound motion into hospital procurement committees, and what founder-led services firms can steal from enterprise healthcare sales.',
  10, 1, 'research',
  null, now() + interval '23 days', null,
  null, '[]'::jsonb,
  array['healthcare services','enterprise sales','procurement'],
  null, null, null, null,
  'Research done. Outreach pending approval.',
  '{}'::jsonb
),
(
  '60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Why Most Founder Podcasts Die at Episode Six (Solo)',
  'A solo episode on the 20 Episode System: what changes at episode 5, 10 and 20, and why counting uploads is the wrong metric.',
  11, 1, 'idea',
  null, null, null,
  null, '[]'::jsonb,
  array['podcasting','founder-led content','consistency'],
  null, null, null, null,
  'Idea from the strategy roadmap. Could slot in if a guest recording slips.',
  '{}'::jsonb
)
on conflict (id) do nothing;

insert into public.episode_guests (id, organization_id, workspace_id, episode_id, guest_id) values
('61000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001'),
('61000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002'),
('61000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003'),
('61000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000004')
on conflict (id) do nothing;

insert into public.interview_briefs (id, organization_id, workspace_id, episode_id, content, status, generated_by) values
('62000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000003',
 '{"guest_summary":"Marcus Chen, founder of Brightline Logistics ($62M, 140 employees). Rebuilt pricing in 2020 from per-load to committed capacity.","angle":"The pricing decision that looked like a mistake for six months","questions":["Walk me through the week in 2020 when you realized per-load pricing was going to sink the company.","What did the first committed-capacity contract look like, and who signed it?","Revenue dropped 20 percent. How did you keep the team from reverting?","What are margins now versus 2019?","What would you tell a $10M broker who is still pricing per load?","Reversal question: what did you believe five years ago that you have completely reversed?"],"avoid":["Do not ask about the 2022 lawsuit with a former carrier partner; settled and under NDA."],"cta_moment":"After the margin numbers, ask if he had outside help on the pricing model."}'::jsonb,
 'pending', 'ai')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Transcript for episode 7 (segments first, then full_text is assembled)
-- ---------------------------------------------------------------------------
insert into public.transcripts (id, organization_id, workspace_id, episode_id, language, source, status, metadata) values
('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', 'en', 'paste', 'ready',
 '{"speakers":["Alex Rivera","Elena Vasquez"],"duration_ms":580000}'::jsonb)
on conflict (id) do nothing;

insert into public.transcript_segments (id, organization_id, workspace_id, transcript_id, idx, speaker, start_ms, end_ms, text)
select
  ('71000000-0000-4000-8000-' || lpad(s.idx::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  s.idx, s.speaker, s.start_ms, s.end_ms, s.text
from (values
 (1, 'Alex Rivera', 0, 24000, $q$Welcome back to The Founder Growth Show. I'm Alex Rivera. Today I'm sitting down with Elena Vasquez, founder and CEO of Northwind Staffing Group. Elena took Northwind from a two-person recruiting desk in Columbus to just over forty million in annual revenue without raising a dollar of outside capital. Elena, welcome.$q$),
 (2, 'Elena Vasquez', 24000, 31000, $q$Thanks, Alex. I've been a listener since the first few episodes, so this is a little surreal.$q$),
 (3, 'Alex Rivera', 31000, 52000, $q$Let's start at the beginning. Most staffing firms plateau somewhere around five to eight million. What was the moment you realized Northwind could be something different?$q$),
 (4, 'Elena Vasquez', 52000, 95000, $q$Honestly, it was a client firing us. In 2017 we lost our biggest account, a regional hospital system, and it was about thirty percent of revenue. I remember sitting in the parking lot thinking, we are a vendor, and vendors are replaceable. That week we decided to stop selling placements and start selling outcomes. Time-to-fill guarantees, retention guarantees, the whole thing.$q$),
 (5, 'Alex Rivera', 95000, 104000, $q$That's a big pricing shift. How did the sales team react?$q$),
 (6, 'Elena Vasquez', 104000, 132000, $q$Half of them left within six months. I'm not proud of that, but the ones who stayed became the core of what we are now. We went from twelve recruiters doing transactional work to a team that runs workforce planning sessions with COOs.$q$),
 (7, 'Alex Rivera', 132000, 142000, $q$You mentioned you never raised capital. Was that a principle or a circumstance?$q$),
 (8, 'Elena Vasquez', 142000, 190000, $q$Both. Early on nobody would have given us money. Later, when the offers came, we ran the numbers and realized we'd be selling forty percent of the company to fund growth we could fund from cash flow if we were just a bit more patient. My partner Dana pushed hard on that. You should meet my partner Dana who runs our advisory arm, Northwind Insights. She spent ten years at a search fund and thinks about capital allocation in a way I never will. I'll make the intro after this.$q$),
 (9, 'Alex Rivera', 190000, 202000, $q$I'd love that. Let's talk about the advisory arm, because that's an unusual move for a staffing company.$q$),
 (10, 'Elena Vasquez', 202000, 238000, $q$It came out of client conversations. Our best clients kept asking us questions that had nothing to do with hiring. Should we open a second location? Is this compensation band competitive? So we productized the answers. Insights is about six million of the forty now, and the margins are roughly three times the staffing side.$q$),
 (11, 'Alex Rivera', 238000, 248000, $q$How do you keep the two businesses from competing for attention internally?$q$),
 (12, 'Elena Vasquez', 248000, 272000, $q$Separate P&Ls, separate leaders, one shared brand promise. Every quarter I ask each leader the same question: what did the other business do for you this quarter? If the answer is nothing, something's broken.$q$),
 (13, 'Alex Rivera', 272000, 282000, $q$Let's go to growth mechanics. What actually moves revenue for Northwind today?$q$),
 (14, 'Elena Vasquez', 282000, 312000, $q$Referrals from placed candidates and founder-led content, in that order. I write a weekly note to about nine thousand operators. It's not fancy. But three of our five largest accounts this year came from someone who forwarded that note to their CEO.$q$),
 (15, 'Alex Rivera', 312000, 316000, $q$And outbound?$q$),
 (16, 'Elena Vasquez', 316000, 352000, $q$Outbound is the honest weak spot. We're actually looking for someone to help us with rebuilding our outbound playbook for the mid-market, because everything we do today is inbound or referral and I know we're leaving deals on the table. We've tried two agencies and both of them just sent more email. I want a system, not more volume.$q$),
 (17, 'Alex Rivera', 352000, 362000, $q$That's a familiar story. What would a good system look like to you?$q$),
 (18, 'Elena Vasquez', 362000, 384000, $q$Fewer accounts, deeper research, and a reason to reach out that isn't "just checking in." Frankly it looks a lot like how you run this show. You clearly do your homework before you talk to someone.$q$),
 (19, 'Alex Rivera', 384000, 396000, $q$I'll take the compliment. You've also started speaking more publicly this year. What changed?$q$),
 (20, 'Elena Vasquez', 396000, 432000, $q$I said yes to one panel and it snowballed. I'm chairing the growth track at the Midwest Staffing Summit in Chicago this March, and we still need a keynote speaker on founder-led sales for the opening morning. If you know anyone, or if you'd consider it yourself, the organizers want someone who actually runs a company rather than a professional speaker.$q$),
 (21, 'Alex Rivera', 432000, 442000, $q$That's very kind. Let's talk about what's next. Where does Northwind go from forty million?$q$),
 (22, 'Elena Vasquez', 442000, 482000, $q$Data. We have twelve years of placement and compensation data across the Midwest that nobody else has. We've been thinking about co-creating an annual hiring benchmark report with an advisory partner, someone who can bring the analysis and the audience while we bring the raw data. Done right, that becomes the piece of content every CFO in our market reads once a year.$q$),
 (23, 'Alex Rivera', 482000, 492000, $q$That sounds like a genuinely defensible asset. What's stopped you from doing it so far?$q$),
 (24, 'Elena Vasquez', 492000, 506000, $q$Bandwidth, and honestly a bit of fear that we'd publish something mediocre. I would rather not do it than do it badly.$q$),
 (25, 'Alex Rivera', 506000, 518000, $q$Last question, one I ask everyone. What's a belief you held five years ago that you've completely reversed?$q$),
 (26, 'Elena Vasquez', 518000, 540000, $q$That growth means hiring salespeople. Growth means building something people want to talk about, and then making it very easy for them to talk about it. The sales team's job is to be there when they do.$q$),
 (27, 'Alex Rivera', 540000, 546000, $q$Elena, thank you. Where can people find you?$q$),
 (28, 'Elena Vasquez', 546000, 566000, $q$The weekly note is at northwindstaffing.com/notes, and I'm on LinkedIn. If you run a mid-market company in the Midwest and you're tired of vendors, come talk to us.$q$),
 (29, 'Alex Rivera', 566000, 580000, $q$That's the show. If this episode was useful, forward it to one founder who needs to hear it. See you next week.$q$)
) as s(idx, speaker, start_ms, end_ms, text)
on conflict (id) do nothing;

-- Assemble full_text from the segments so both stay verbatim-consistent.
update public.transcripts t
   set full_text = agg.body,
       word_count = array_length(regexp_split_to_array(agg.body, '\s+'), 1)
  from (
    select transcript_id, string_agg(speaker || ': ' || text, E'\n\n' order by idx) as body
      from public.transcript_segments
     where transcript_id = '70000000-0000-4000-8000-000000000001'
     group by transcript_id
  ) agg
 where t.id = agg.transcript_id
   and t.full_text is null;

-- Podcast Brain: one lexical chunk per segment for episode 7.
insert into public.knowledge_chunks (id, organization_id, workspace_id, source_type, source_id, episode_id, transcript_id, idx, content, metadata)
select
  ('72000000-0000-4000-8000-' || lpad(idx::text, 12, '0'))::uuid,
  organization_id, workspace_id, 'transcript_segment', id,
  '60000000-0000-4000-8000-000000000001', transcript_id, idx,
  speaker || ': ' || text,
  jsonb_build_object('speaker', speaker, 'start_ms', start_ms, 'end_ms', end_ms, 'episode_number', 7)
from public.transcript_segments
where transcript_id = '70000000-0000-4000-8000-000000000001'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quotes, topics, content assets
-- ---------------------------------------------------------------------------
insert into public.quotes (id, organization_id, workspace_id, episode_id, transcript_id, contact_id, text, start_ms, context, tags) values
('73000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
 'We are a vendor, and vendors are replaceable.', 52000, 'On losing her biggest client in 2017.', array['positioning','pricing']),
('73000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
 'Every quarter I ask each leader the same question: what did the other business do for you this quarter? If the answer is nothing, something''s broken.', 248000, 'On running two business lines under one brand.', array['leadership','operations']),
('73000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
 'Growth means building something people want to talk about, and then making it very easy for them to talk about it. The sales team''s job is to be there when they do.', 518000, 'Answer to the reversal question.', array['growth','founder-led sales','clip'])
on conflict (id) do nothing;

insert into public.topics (id, organization_id, workspace_id, name, slug) values
('74000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Founder-led sales', 'founder-led-sales'),
('74000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Pricing', 'pricing'),
('74000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Bootstrapping', 'bootstrapping'),
('74000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Exit planning', 'exit-planning'),
('74000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Outbound', 'outbound')
on conflict (id) do nothing;

insert into public.episode_topics (id, organization_id, workspace_id, episode_id, topic_id) values
('75000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001'),
('75000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000002'),
('75000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000003'),
('75000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000005'),
('75000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000004'),
('75000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', '74000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.content_assets (id, organization_id, workspace_id, episode_id, transcript_id, type, title, body, url, metadata, generated_by, status) values
('76000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'clip',
 'Vendors are replaceable', null, 'https://cdn.example.com/fgs/007-clip-01.mp4',
 '{"start_ms":52000,"end_ms":95000,"aspect":"9:16"}'::jsonb, 'user', 'published'),
('76000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'social_post',
 'LinkedIn: the reversal question',
 $q$Five years ago Elena Vasquez believed growth meant hiring salespeople.

Today Northwind Staffing does $40M, bootstrapped, and three of its five largest accounts this year came from a forwarded email.

"Growth means building something people want to talk about, and then making it very easy for them to talk about it."

Full conversation on The Founder Growth Show, episode 7. Link in comments.$q$,
 null, '{"platform":"linkedin"}'::jsonb, 'ai', 'published'),
('76000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000002', null, 'title',
 'Title options for episode 8',
 $q$1. Rachel Lindqvist on What Acquirers Actually Pay For in a Services Business
2. The First Thing a Buyer Prices In: Founder-Dependent Sales
3. Six Acquisitions Later: What Kills a Services Valuation$q$,
 null, '{"count":3}'::jsonb, 'ai', 'pending_approval'),
('76000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000002', null, 'show_notes',
 'Show notes draft for episode 8',
 $q$Rachel Lindqvist has acquired six founder-led services companies at Halvorsen Ventures. In this episode she explains what buyers actually pay for, why founder-dependent sales is the first risk she prices in, and the two-year checklist she gives founders who think they might sell.$q$,
 null, '{}'::jsonb, 'ai', 'draft')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Opportunities (Opportunity Engine output for episode 7)
-- evidence_excerpt is verbatim from transcript_segments.
-- ---------------------------------------------------------------------------
insert into public.opportunities (
  id, organization_id, workspace_id, type, status, title, summary, contact_id, episode_id, transcript_id,
  evidence_excerpt, evidence_start_ms, confidence, potential_value, priority, next_action, due_date, owner_id, detected_by
) values
(
  '80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'introduction', 'detected', 'Introduction to Dana Whitfield (Northwind Insights)',
  'Elena offered to introduce Alex to her partner Dana Whitfield, who runs the Northwind Insights advisory arm and has a search fund background. Strong fit for the Capital Allocator guest archetype and a potential referral source.',
  '40000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  'You should meet my partner Dana who runs our advisory arm, Northwind Insights.', 142000,
  0.92, null, 'high', 'Reply to Elena''s thank-you email and accept the introduction.', current_date,
  '00000000-0000-0000-0000-000000000001', 'ai'
),
(
  '80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'sales', 'detected', 'Northwind Staffing wants help rebuilding its outbound playbook',
  'Elena stated on air that Northwind is looking for someone to rebuild its mid-market outbound playbook and that two agencies have already failed. This maps directly to the Founder-Led Growth System engagement.',
  '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  'We''re actually looking for someone to help us with rebuilding our outbound playbook for the mid-market, because everything we do today is inbound or referral and I know we''re leaving deals on the table.', 316000,
  0.95, 36000, 'urgent', 'Propose a 30-minute growth diagnostic focused on outbound.', current_date + 2,
  '00000000-0000-0000-0000-000000000001', 'ai'
),
(
  '80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'speaking', 'detected', 'Keynote slot at the Midwest Staffing Summit (Chicago, March)',
  'Elena chairs the growth track and said the summit still needs an opening-morning keynote on founder-led sales, ideally from an operator. Audience is staffing company owners in the Midwest, squarely in the Acme ICP.',
  '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  'I''m chairing the growth track at the Midwest Staffing Summit in Chicago this March, and we still need a keynote speaker on founder-led sales for the opening morning.', 396000,
  0.88, null, 'high', 'Ask Elena for the organizer contact and submit a keynote outline.', current_date + 5,
  '00000000-0000-0000-0000-000000000001', 'ai'
),
(
  '80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  'partnership', 'detected', 'Co-create an annual Midwest hiring benchmark report with Northwind',
  'Northwind has twelve years of placement and compensation data and wants an advisory partner to bring analysis and audience for an annual benchmark report. A co-branded report would put Acme in front of every CFO in the market.',
  '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  'We''ve been thinking about co-creating an annual hiring benchmark report with an advisory partner, someone who can bring the analysis and the audience while we bring the raw data.', 442000,
  0.81, null, 'medium', 'Draft a one-page proposal for a co-branded benchmark report.', current_date + 10,
  '00000000-0000-0000-0000-000000000001', 'ai'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tasks (due today / upcoming / done)
-- ---------------------------------------------------------------------------
insert into public.tasks (
  id, organization_id, workspace_id, title, description, status, priority, assignee_id, due_date, source,
  contact_id, guest_id, episode_id, opportunity_id, completed_at
) values
('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Accept Elena''s introduction to Dana Whitfield', 'Reply to Elena''s thank-you thread and take her up on the Dana intro. Suggest two times next week.',
 'todo', 'high', '00000000-0000-0000-0000-000000000001', current_date, 'opportunity',
 '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', null),
('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Choose episode 8 title from the three options', 'Three AI-generated options are waiting in the Approval Center. Editor needs the title for the thumbnail.',
 'todo', 'medium', '00000000-0000-0000-0000-000000000001', current_date, 'episode_workflow',
 null, null, '60000000-0000-4000-8000-000000000002', null, null),
('81000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Review interview brief for Marcus Chen', 'Check the AI brief before recording. Confirm the 2022 lawsuit stays off the list.',
 'todo', 'medium', '00000000-0000-0000-0000-000000000001', current_date + 3, 'episode_workflow',
 '40000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', null, null),
('81000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Pitch Tom Okafor for a guest spot on Operators Weekly', 'Lead with the two former Acme clients Tom has already interviewed. Offer the pricing-for-services angle.',
 'todo', 'low', '00000000-0000-0000-0000-000000000001', current_date + 7, 'guest_mode',
 '40000000-0000-4000-8000-000000000005', null, null, null, null),
('81000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Upload and review episode 7 transcript', 'Paste the Riverside transcript, fix speaker labels, mark ready.',
 'done', 'medium', '00000000-0000-0000-0000-000000000001', current_date - 6, 'episode_workflow',
 null, null, '60000000-0000-4000-8000-000000000001', null, now() - interval '6 days'),
('81000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Send Rachel Lindqvist the sharing kit preview', 'Share draft clips and the release date so she can plan her LinkedIn post.',
 'done', 'medium', '00000000-0000-0000-0000-000000000001', current_date - 2, 'guest_workflow',
 '40000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', null, now() - interval '2 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Approvals (pending)
-- ---------------------------------------------------------------------------
insert into public.approvals (id, organization_id, workspace_id, entity_type, entity_id, kind, status, requested_by, note) values
('82000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'outreach_message', '52000000-0000-4000-8000-000000000001', 'outreach', 'pending', null,
 'AI-drafted outreach to Priya Natarajan. External send requires approval.'),
('82000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'content_asset', '76000000-0000-4000-8000-000000000003', 'title', 'pending', null,
 'Three title options for episode 8.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Providers, publishing
-- ---------------------------------------------------------------------------
insert into public.provider_connections (id, organization_id, workspace_id, capability, provider, status, display_name, config) values
('83000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'ai', 'anthropic', 'disconnected', 'Anthropic (bring your own key)', '{"model":"claude-sonnet-4-5"}'::jsonb),
('83000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'crm', 'gohighlevel', 'disconnected', 'GoHighLevel', '{}'::jsonb),
('83000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'recording', 'riverside', 'disconnected', 'Riverside', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.publishing_destinations (id, organization_id, workspace_id, podcast_id, kind, provider, provider_connection_id, config) values
('84000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001', 'rss_host', 'mock', null, '{"feed_url":"https://feeds.example.com/founder-growth-show"}'::jsonb),
('84000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001', 'youtube', 'mock', null, '{"channel":"@foundergrowthshow"}'::jsonb)
on conflict (id) do nothing;

insert into public.publishing_jobs (id, organization_id, workspace_id, episode_id, destination_id, status, scheduled_for, published_at, external_id, external_url, attempts) values
('85000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'published', now() - interval '5 days', now() - interval '5 days',
 'mock-rss-007', 'https://feeds.example.com/founder-growth-show/007', 1),
('85000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000002', 'published', now() - interval '5 days', now() - interval '5 days',
 'fgs007demo', 'https://youtube.com/watch?v=fgs007demo', 1),
('85000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '60000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000001', 'scheduled', now() + interval '2 days', null, null, null, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Guest mode target, releases, revenue
-- ---------------------------------------------------------------------------
insert into public.target_podcasts (id, organization_id, workspace_id, name, host_name, url, category, audience, fit_score, research, contact_id, status, notes) values
('86000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'Operators Weekly', 'Tom Okafor', 'https://operatorsweekly.example.com', 'Business / Small business',
 'About 25,000 downloads per episode; owners of $2M-$20M blue-collar and services companies', 84,
 '{"recent_guests":["Two former Acme Advisory clients","Owner of a regional HVAC roll-up"],"format":"45-minute interview, audio-first","pitch_angle":"Pricing for services: the first client who said no"}'::jsonb,
 '40000000-0000-4000-8000-000000000005', 'researched',
 'Warm path via former clients. Pitch after episode 8 ships so there is a fresh clip to reference.')
on conflict (id) do nothing;

insert into public.guest_releases (id, organization_id, workspace_id, guest_id, episode_id, version, recording_consent, publishing_rights, editing_permission, promotional_reuse, ai_processing, accepted_at, evidence) values
('87000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'v1', true, true, true, true, true, now() - interval '13 days',
 '{"method":"web_form","ip":"203.0.113.24","user_agent":"Mozilla/5.0"}'::jsonb),
('87000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'v1', true, true, true, true, false, now() - interval '6 days',
 '{"method":"web_form","ip":"203.0.113.71","user_agent":"Mozilla/5.0"}'::jsonb)
on conflict (id) do nothing;

insert into public.revenue_events (id, organization_id, workspace_id, contact_id, opportunity_id, episode_id, amount, kind, note, occurred_at, created_by) values
('88000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000006', null, null, 12000.00, 'influenced',
 'First month of a retainer with a Halvorsen portfolio company referred by Rachel before recording.', now() - interval '8 days',
 '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Foundation extras: a job, an audit trail, a notification
-- ---------------------------------------------------------------------------
insert into public.background_jobs (id, organization_id, workspace_id, kind, status, payload, result, attempts, idempotency_key, related_entity_type, related_entity_id, provider, started_at, finished_at) values
('89000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'opportunity_extraction', 'completed', '{"transcript_id":"70000000-0000-4000-8000-000000000001"}'::jsonb,
 '{"opportunities_detected":4}'::jsonb, 1, 'opportunity_extraction:70000000-0000-4000-8000-000000000001',
 'transcript', '70000000-0000-4000-8000-000000000001', 'mock', now() - interval '6 days', now() - interval '6 days' + interval '40 seconds'),
('89000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 'publish_episode', 'queued', '{"publishing_job_id":"85000000-0000-4000-8000-000000000003"}'::jsonb,
 null, 0, 'publish:85000000-0000-4000-8000-000000000003', 'publishing_job', '85000000-0000-4000-8000-000000000003', 'mock', null, null)
on conflict (id) do nothing;

insert into public.audit_logs (id, organization_id, workspace_id, actor_id, action, entity_type, entity_id, metadata, created_at) values
('8a000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '00000000-0000-0000-0000-000000000001', 'episode.status_changed', 'episode', '60000000-0000-4000-8000-000000000001',
 '{"from":"distribution","to":"complete"}'::jsonb, now() - interval '3 days'),
('8a000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 null, 'opportunities.detected', 'transcript', '70000000-0000-4000-8000-000000000001',
 '{"count":4,"job_id":"89000000-0000-4000-8000-000000000001"}'::jsonb, now() - interval '6 days'),
('8a000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '00000000-0000-0000-0000-000000000001', 'guest.stage_changed', 'guest', '50000000-0000-4000-8000-000000000003',
 '{"from":"interested","to":"booked"}'::jsonb, now() - interval '10 days')
on conflict (id) do nothing;

insert into public.notifications (id, organization_id, user_id, kind, title, body, href) values
('91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
 'opportunities_detected', '4 opportunities detected in episode 7',
 'Introduction, sales, speaking and partnership opportunities were found in your conversation with Elena Vasquez.',
 '/opportunities')
on conflict (id) do nothing;
