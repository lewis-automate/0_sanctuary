-- Review / practice count per study item
alter table public.study_items
  add column if not exists times_used integer not null default 0;
