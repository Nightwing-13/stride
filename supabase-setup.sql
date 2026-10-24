-- Stride: one-time Supabase setup. Paste into Dashboard -> SQL Editor -> New query -> Run.

-- 1. One table holds every synced record (activities, food entries, settings, program progress).
--    `updated_at` is when you edited it on a device (used to decide which edit wins);
--    `synced_at` is set by the server on every write (used by devices to fetch what's new).
create table if not exists public.stride_records (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  kind       text        not null,
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists stride_records_synced on public.stride_records (user_id, synced_at);

create or replace function public.stride_touch() returns trigger language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end $$;
drop trigger if exists stride_touch on public.stride_records;
create trigger stride_touch before insert or update on public.stride_records
  for each row execute function public.stride_touch();

-- 2. Row-level security: you can only ever read or write your own rows.
alter table public.stride_records enable row level security;
drop policy if exists "own rows" on public.stride_records;
create policy "own rows" on public.stride_records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Private storage for the program and recipe content from your PDFs (never public).
insert into storage.buckets (id, name, public) values ('content', 'content', false)
  on conflict (id) do nothing;
drop policy if exists "stride content read" on storage.objects;
drop policy if exists "stride content insert" on storage.objects;
drop policy if exists "stride content update" on storage.objects;
create policy "stride content read"   on storage.objects for select to authenticated using (bucket_id = 'content');
create policy "stride content insert" on storage.objects for insert to authenticated with check (bucket_id = 'content');
create policy "stride content update" on storage.objects for update to authenticated using (bucket_id = 'content');
