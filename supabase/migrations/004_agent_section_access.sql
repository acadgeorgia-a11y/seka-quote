alter table public.agents
  add column if not exists section_access jsonb not null default '{"sales": true, "cs": true}';
