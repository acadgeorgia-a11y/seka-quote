create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'not_started'
    check (status in ('not_started','planning','in_progress','review','done')),
  assignee text check (assignee in ('Alex','Terry','Chris','Rob')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;
create policy "tasks_all" on tasks using (true) with check (true);
