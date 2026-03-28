-- Rapid review ordering and scoring (safe if columns already exist)
alter table public.study_items
  add column if not exists last_used timestamptz;

alter table public.study_items
  add column if not exists mastery_score double precision not null default 0;

alter table public.study_items
  add column if not exists frequency integer not null default 0;
