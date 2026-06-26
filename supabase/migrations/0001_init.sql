-- ============================================================================
-- Says Who?  —  initial schema (run once)
--
-- This migration is written for SUPABASE (it references the `auth` schema and
-- the default `supabase_realtime` publication). Run it in the Supabase SQL
-- editor, or via `supabase db push` if you use the CLI.
--
-- Security model
-- --------------
-- Members & captains DO NOT authenticate. Only the admin (an auth.users row)
-- ever touches the database directly, and RLS restricts them to groups they
-- own (groups.created_by = auth.uid()). All member/captain reads & writes go
-- through server route handlers that hold the SERVICE ROLE key and validate
-- the group's join_code first. The service role bypasses RLS, so anon clients
-- never need (and never get) direct table access.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================ groups ========================================
create table public.groups (
  id                   uuid primary key default gen_random_uuid(),
  created_by           uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  category             text not null default 'friends',   -- family|work|travel|church|friends|general|custom
  category_custom_desc text,
  dynamic_note         text not null default '',           -- the "good to know" freeform
  join_code            text not null unique,
  num_teams            int  not null default 2,
  num_rounds           int  not null default 1,
  team_assignment      text not null default 'random',     -- random | admin
  calibration_constant numeric,                            -- derived; null until computed (see M8)
  consensus_threshold  numeric not null default 0.3333,    -- top-bucket fraction required to be "usable"
  status               text not null default 'setup',      -- setup | ready | live | done
  scheduled_time       timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================ teams =========================================
create table public.teams (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups (id) on delete cascade,
  name              text not null,
  team_index        int  not null default 0,
  crest_seed        text,                                  -- Phase 2: AI/SVG crest seed
  captain_member_id uuid,                                  -- FK added after members table exists
  created_at        timestamptz not null default now()
);

-- ============================ members =======================================
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  display_name text not null,
  is_captain   boolean not null default false,
  team_id      uuid references public.teams (id) on delete set null,
  avatar_seed  text,                                       -- Phase 2: SVG trait-kit seed
  created_at   timestamptz not null default now()
);

alter table public.teams
  add constraint teams_captain_member_fk
  foreign key (captain_member_id) references public.members (id) on delete set null;

-- ============================ feud_questions ================================
create table public.feud_questions (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  prompt          text not null,
  type            text not null,                           -- pick_person | likelihood | multiple_choice | open_text
  options         jsonb,                                   -- choices for multiple_choice / likelihood scale
  source          text not null default 'recommended',     -- recommended | admin
  ai_recommended  boolean not null default false,
  is_buffer       boolean not null default false,          -- overshoot buffer question (everyone answers)
  usable          boolean,                                 -- null until consensus computed (M6)
  consensus_score numeric,                                 -- fraction of responses in the top bucket
  top_bucket      text,                                    -- winning answer label after clustering
  created_at      timestamptz not null default now()
);

-- ============================ feud_responses ================================
create table public.feud_responses (
  id                uuid primary key default gen_random_uuid(),
  question_id       uuid not null references public.feud_questions (id) on delete cascade,
  member_id         uuid not null references public.members (id) on delete cascade,
  raw_answer        text not null,
  normalized_bucket text,                                  -- assigned by the clusterer/normalizer
  created_at        timestamptz not null default now(),
  unique (question_id, member_id)
);

-- ============================ feud_question_assignments =====================
-- The "fresh holdout": the single member who will PLAY this question live.
-- They did NOT answer it; the other N-1 did, so there is a real tally to guess.
create table public.feud_question_assignments (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  question_id uuid not null references public.feud_questions (id) on delete cascade,
  member_id   uuid not null references public.members (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (group_id, member_id),                            -- one holdout question per member
  unique (group_id, question_id)                           -- a question is held out for at most one member
);

-- ============================ trivia_topics =================================
create table public.trivia_topics (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  team_id    uuid references public.teams (id) on delete cascade,
  category   text not null,                                -- Sports | Geography | Literature | Entertainment | Science & Nature | custom
  name       text not null,
  selected   boolean not null default false,               -- chosen by the team's captain
  source     text not null default 'recommended',          -- recommended | custom
  created_at timestamptz not null default now()
);

-- ============================ trivia_questions ==============================
create table public.trivia_questions (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups (id) on delete cascade,
  team_id           uuid not null references public.teams (id) on delete cascade,
  topic             text not null,
  prompt            text not null,
  correct_answer    text not null,
  accepted_variants jsonb not null default '[]'::jsonb,    -- array of acceptable answer strings
  point_value       int  not null default 3,               -- calibrated against feud EV (see M8)
  round_no          int,
  used              boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ============================ games =========================================
create table public.games (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups (id) on delete cascade,
  status            text not null default 'setup',         -- setup | active | paused | done
  num_teams         int  not null default 2,
  num_rounds        int  not null default 1,
  current_round     int  not null default 1,
  current_team_id   uuid references public.teams (id),
  current_member_id uuid references public.members (id),
  current_phase     text not null default 'feud',          -- feud | trivia
  settings          jsonb not null default '{"feudSeconds":25,"triviaSeconds":210}'::jsonb,
  state             jsonb not null default '{}'::jsonb,     -- turn queue / cursor (lets admin refresh mid-game)
  started_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================ game_events ===================================
create table public.game_events (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  type       text not null,                                -- feud_result | trivia_result | round_start | game_over | ...
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================ game_scores ===================================
create table public.game_scores (
  id       uuid primary key default gen_random_uuid(),
  game_id  uuid not null references public.games (id) on delete cascade,
  team_id  uuid not null references public.teams (id) on delete cascade,
  points   int not null default 0,
  unique (game_id, team_id)
);

-- ============================ indexes =======================================
create index members_group_idx              on public.members (group_id);
create index teams_group_idx                on public.teams (group_id);
create index feud_questions_group_idx       on public.feud_questions (group_id);
create index feud_responses_question_idx    on public.feud_responses (question_id);
create index feud_responses_member_idx      on public.feud_responses (member_id);
create index feud_assignments_group_idx     on public.feud_question_assignments (group_id);
create index trivia_topics_group_idx        on public.trivia_topics (group_id);
create index trivia_questions_group_idx     on public.trivia_questions (group_id);
create index trivia_questions_team_idx      on public.trivia_questions (team_id);
create index games_group_idx                on public.games (group_id);
create index game_events_game_idx           on public.game_events (game_id);

-- ============================ updated_at triggers ===========================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger groups_touch_updated_at
  before update on public.groups
  for each row execute function public.touch_updated_at();

create trigger games_touch_updated_at
  before update on public.games
  for each row execute function public.touch_updated_at();

-- ============================ row level security ============================
-- Every table: owner-only via the parent group's created_by. The service-role
-- key (used by member-facing server routes) bypasses all of this.

alter table public.groups                    enable row level security;
alter table public.teams                     enable row level security;
alter table public.members                   enable row level security;
alter table public.feud_questions            enable row level security;
alter table public.feud_responses            enable row level security;
alter table public.feud_question_assignments enable row level security;
alter table public.trivia_topics             enable row level security;
alter table public.trivia_questions          enable row level security;
alter table public.games                     enable row level security;
alter table public.game_events               enable row level security;
alter table public.game_scores               enable row level security;

-- groups: direct ownership
create policy groups_owner_all on public.groups
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- helper: a child row belongs to the admin if its group is owned by them
create policy teams_owner_all on public.teams
  for all using (exists (select 1 from public.groups g where g.id = teams.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = teams.group_id and g.created_by = auth.uid()));

create policy members_owner_all on public.members
  for all using (exists (select 1 from public.groups g where g.id = members.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = members.group_id and g.created_by = auth.uid()));

create policy feud_questions_owner_all on public.feud_questions
  for all using (exists (select 1 from public.groups g where g.id = feud_questions.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = feud_questions.group_id and g.created_by = auth.uid()));

create policy feud_responses_owner_all on public.feud_responses
  for all using (exists (
    select 1 from public.feud_questions q join public.groups g on g.id = q.group_id
    where q.id = feud_responses.question_id and g.created_by = auth.uid()))
  with check (exists (
    select 1 from public.feud_questions q join public.groups g on g.id = q.group_id
    where q.id = feud_responses.question_id and g.created_by = auth.uid()));

create policy feud_assignments_owner_all on public.feud_question_assignments
  for all using (exists (select 1 from public.groups g where g.id = feud_question_assignments.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = feud_question_assignments.group_id and g.created_by = auth.uid()));

create policy trivia_topics_owner_all on public.trivia_topics
  for all using (exists (select 1 from public.groups g where g.id = trivia_topics.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = trivia_topics.group_id and g.created_by = auth.uid()));

create policy trivia_questions_owner_all on public.trivia_questions
  for all using (exists (select 1 from public.groups g where g.id = trivia_questions.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = trivia_questions.group_id and g.created_by = auth.uid()));

create policy games_owner_all on public.games
  for all using (exists (select 1 from public.groups g where g.id = games.group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = games.group_id and g.created_by = auth.uid()));

create policy game_events_owner_all on public.game_events
  for all using (exists (
    select 1 from public.games gm join public.groups g on g.id = gm.group_id
    where gm.id = game_events.game_id and g.created_by = auth.uid()))
  with check (exists (
    select 1 from public.games gm join public.groups g on g.id = gm.group_id
    where gm.id = game_events.game_id and g.created_by = auth.uid()));

create policy game_scores_owner_all on public.game_scores
  for all using (exists (
    select 1 from public.games gm join public.groups g on g.id = gm.group_id
    where gm.id = game_scores.game_id and g.created_by = auth.uid()))
  with check (exists (
    select 1 from public.games gm join public.groups g on g.id = gm.group_id
    where gm.id = game_scores.game_id and g.created_by = auth.uid()));

-- ============================ realtime ======================================
-- Powers the admin's live pre-game dashboard (members submitting, topics
-- chosen, etc.). RLS still applies to realtime, so the admin only streams
-- their own group's rows.
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.feud_responses;
alter publication supabase_realtime add table public.feud_question_assignments;
alter publication supabase_realtime add table public.trivia_topics;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_scores;
