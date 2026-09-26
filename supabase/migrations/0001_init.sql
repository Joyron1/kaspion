-- Kaspion: texts, narration audio, tuning settings and play-time stats.
-- The app ships every text with a default in code; rows here only override it.
-- Reads are public (the game needs them); every write goes through the app's
-- server routes with the service-role key, after the parent logs in.

create table if not exists public.lines (
  key          text primary key,
  text         text,        -- text shown on screen (may carry nikud); null = default from code
  speech       text,        -- text sent to the narrator voice; null = same as text
  audio_path   text,        -- path inside the "narration" bucket
  audio_source text check (audio_source in ('recorded', 'uploaded', 'tts')),
  audio_for    text,        -- the speech text the audio was made from (to spot stale audio)
  reviewed     boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists public.settings (
  key        text primary key,   -- e.g. 'level.reef' or 'narrator'
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.plays (
  id         bigint generated always as identity primary key,
  level_id   text not null,
  seconds    integer not null check (seconds between 0 and 3600),
  completed  boolean not null default true,
  stages     jsonb,               -- seconds per stage
  created_at timestamptz not null default now()
);
create index if not exists plays_level_idx on public.plays (level_id, created_at desc);

alter table public.lines    enable row level security;
alter table public.settings enable row level security;
alter table public.plays    enable row level security;

drop policy if exists "lines readable by everyone" on public.lines;
create policy "lines readable by everyone" on public.lines for select using (true);

drop policy if exists "settings readable by everyone" on public.settings;
create policy "settings readable by everyone" on public.settings for select using (true);
-- plays: no public policies; only the server (service role) reads and writes them.

-- Public bucket for narration audio (recorded, uploaded or generated).
insert into storage.buckets (id, name, public)
values ('narration', 'narration', true)
on conflict (id) do update set public = true;
