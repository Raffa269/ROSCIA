-- ROSCIA Growth Tracker | schema Supabase
-- Da eseguire UNA VOLTA nel SQL Editor del progetto Supabase.
-- Ogni campo è salvato in una riga distinta: modifiche da PC diversi
-- su campi diversi non cancellano accidentalmente altri dati.
create table if not exists public.roscia_tracker_values (
  user_id uuid not null references auth.users(id) on delete cascade,
  field_key text not null check (length(field_key) between 1 and 80),
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, field_key)
);

alter table public.roscia_tracker_values enable row level security;
alter table public.roscia_tracker_values force row level security;

-- Espliciti privilegi minimi: nessun accesso anonimo o cancellazione diretta.
revoke all on public.roscia_tracker_values from anon;
revoke all on public.roscia_tracker_values from authenticated;


-- La policy consente lettura/scrittura soltanto al proprietario autenticato.
drop policy if exists roscia_read_own on public.roscia_tracker_values;
create policy roscia_read_own on public.roscia_tracker_values
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists roscia_insert_own on public.roscia_tracker_values;
create policy roscia_insert_own on public.roscia_tracker_values
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists roscia_update_own on public.roscia_tracker_values;
create policy roscia_update_own on public.roscia_tracker_values
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Trigger facoltativo per timestamp.
create or replace function public.roscia_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists roscia_values_updated on public.roscia_tracker_values;
create trigger roscia_values_updated before update on public.roscia_tracker_values
for each row execute function public.roscia_set_updated_at();

grant select, insert, update on public.roscia_tracker_values to authenticated;

revoke all on function public.roscia_set_updated_at() from public;
