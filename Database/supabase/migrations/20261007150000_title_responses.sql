-- ============================================================================
-- Title responses: an exhibitor tells CJ it is NOT showing a title in a given
-- format. One row per (exhibitor, title, format). "Undo" deletes the row.
-- A booking or request always wins over a pass in the UI, so the two never
-- contradict each other even if a stale row remains.
-- ============================================================================

create table if not exists title_responses (
  id bigint generated always as identity primary key,
  exhibitor_unique varchar not null references exhibitor_db (exhibitor_unique),
  title_no varchar not null references "Title_master" (title_no),
  format text not null check (format in ('4DX', 'ScreenX')),
  response text not null default 'not_showing' check (response in ('not_showing')),
  responded_by text,
  responded_at timestamptz not null default now(),
  unique (exhibitor_unique, title_no, format)
);

create index if not exists title_responses_title_no_idx on title_responses (title_no);

alter table title_responses enable row level security;

drop policy if exists "exhibitors manage own title responses" on title_responses;
drop policy if exists "team full access title responses" on title_responses;

create policy "exhibitors manage own title responses" on title_responses
  for all
  using (exhibitor_unique = current_exhibitor_unique())
  with check (exhibitor_unique = current_exhibitor_unique());

create policy "team full access title responses" on title_responses
  for all using (is_team()) with check (is_team());

grant select, insert, update, delete on title_responses to authenticated;
