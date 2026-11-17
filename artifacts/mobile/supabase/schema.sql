-- Wetriva schema. Run this file in the Supabase SQL Editor.

create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  push_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  condition text check (condition in ('excellent', 'good', 'fair')),
  photo_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'handed_over', 'returned', 'overdue')),
  duration_days integer not null check (duration_days between 1 and 14),
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  returned_at timestamptz,
  check (owner_id <> borrower_id)
);

create index if not exists items_owner_available_idx
  on public.items (owner_id, is_available);
create index if not exists loans_owner_status_idx
  on public.loans (owner_id, status, requested_at desc);
create index if not exists loans_borrower_status_idx
  on public.loans (borrower_id, status, requested_at desc);
create index if not exists connections_user_status_idx
  on public.connections (user_id, status);
create index if not exists connections_friend_status_idx
  on public.connections (friend_id, status);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.connections enable row level security;
alter table public.loans enable row level security;

revoke select on public.profiles from anon, authenticated;
grant select (id, name, avatar_url, created_at)
  on public.profiles to authenticated;
grant update (name, avatar_url, push_token)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update (status) on public.connections to authenticated;
grant select, insert, update (status, due_at, returned_at)
  on public.loans to authenticated;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated
  on public.profiles for select to authenticated
  using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists items_read_owner_or_accepted_friend on public.items;
create policy items_read_owner_or_accepted_friend
  on public.items for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.connections c
      where c.status = 'accepted'
        and (
          (c.user_id = (select auth.uid()) and c.friend_id = items.owner_id)
          or (c.friend_id = (select auth.uid()) and c.user_id = items.owner_id)
        )
    )
  );

drop policy if exists items_insert_owner on public.items;
create policy items_insert_owner
  on public.items for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists items_update_owner on public.items;
create policy items_update_owner
  on public.items for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists items_delete_owner on public.items;
create policy items_delete_owner
  on public.items for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists connections_read_participant on public.connections;
create policy connections_read_participant
  on public.connections for select to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

drop policy if exists connections_insert_requester on public.connections;
create policy connections_insert_requester
  on public.connections for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and friend_id <> (select auth.uid())
    and status = 'pending'
  );

drop policy if exists connections_update_recipient on public.connections;
create policy connections_update_recipient
  on public.connections for update to authenticated
  using (friend_id = (select auth.uid()) and status = 'pending')
  with check (friend_id = (select auth.uid()) and status = 'accepted');

drop policy if exists loans_read_participant on public.loans;
create policy loans_read_participant
  on public.loans for select to authenticated
  using (
    owner_id = (select auth.uid())
    or borrower_id = (select auth.uid())
  );

drop policy if exists loans_insert_borrower_request on public.loans;
create policy loans_insert_borrower_request
  on public.loans for insert to authenticated
  with check (
    borrower_id = (select auth.uid())
    and owner_id <> (select auth.uid())
    and status = 'requested'
    and exists (
      select 1
      from public.items i
      where i.id = item_id
        and i.owner_id = loans.owner_id
        and i.is_available = true
    )
  );

drop policy if exists loans_update_owner on public.loans;
create policy loans_update_owner
  on public.loans for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Create a profile whenever a new Supabase Auth account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'مستخدم جديد')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- The app only receives profile fields, never the private email in auth.users.
create or replace function public.find_profile_by_email(email_input text)
returns table (id uuid, name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where auth.uid() is not null
    and lower(u.email) = lower(trim(email_input))
  limit 1;
$$;

revoke all on function public.find_profile_by_email(text) from public, anon;
grant execute on function public.find_profile_by_email(text) to authenticated;

create or replace function public.has_push_notifications_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.push_token is not null
     from public.profiles p
     where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.has_push_notifications_enabled() from public, anon;
grant execute on function public.has_push_notifications_enabled() to authenticated;

-- Use RPCs so loan status and item availability change in one transaction.
create or replace function public.respond_to_loan(p_loan_id uuid, p_accept boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.loans
  set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_loan_id
    and owner_id = (select auth.uid())
    and status = 'requested';

  if not found then
    raise exception 'loan_not_available';
  end if;
end;
$$;

create or replace function public.confirm_handover(p_loan_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  selected_item_id uuid;
  selected_duration integer;
begin
  select l.item_id, l.duration_days
    into selected_item_id, selected_duration
  from public.loans l
  where l.id = p_loan_id
    and l.owner_id = (select auth.uid())
    and l.status = 'accepted'
  for update;

  if not found then
    raise exception 'loan_not_ready_for_handover';
  end if;

  update public.items
    set is_available = false
  where id = selected_item_id
    and owner_id = (select auth.uid())
    and is_available = true;

  if not found then
    raise exception 'item_not_available';
  end if;

  update public.loans
    set status = 'handed_over',
        due_at = now() + (selected_duration * interval '1 day')
  where id = p_loan_id;
end;
$$;

create or replace function public.confirm_return(p_loan_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  selected_item_id uuid;
begin
  select l.item_id
    into selected_item_id
  from public.loans l
  where l.id = p_loan_id
    and l.owner_id = (select auth.uid())
    and l.status in ('handed_over', 'overdue')
  for update;

  if not found then
    raise exception 'loan_not_ready_for_return';
  end if;

  update public.items
    set is_available = true
  where id = selected_item_id
    and owner_id = (select auth.uid());

  if not found then
    raise exception 'item_not_found';
  end if;

  update public.loans
    set status = 'returned',
        returned_at = now()
  where id = p_loan_id;
end;
$$;

revoke all on function public.respond_to_loan(uuid, boolean) from public, anon;
revoke all on function public.confirm_handover(uuid) from public, anon;
revoke all on function public.confirm_return(uuid) from public, anon;
grant execute on function public.respond_to_loan(uuid, boolean) to authenticated;
grant execute on function public.confirm_handover(uuid) to authenticated;
grant execute on function public.confirm_return(uuid) to authenticated;

-- Item photos are publicly viewable; users can manage files only in their own folder.
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists item_photos_public_read on storage.objects;
create policy item_photos_public_read
  on storage.objects for select to public
  using (bucket_id = 'item-photos');

drop policy if exists item_photos_upload_own_folder on storage.objects;
create policy item_photos_upload_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists item_photos_update_own_folder on storage.objects;
create policy item_photos_update_own_folder
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists item_photos_delete_own_folder on storage.objects;
create policy item_photos_delete_own_folder
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Keep returned and declined loans unchanged; only active handovers can become overdue.
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'wetriva-mark-overdue-loans';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'wetriva-mark-overdue-loans',
    '0 2 * * *',
    $job$
      update public.loans
      set status = 'overdue'
      where status = 'handed_over'
        and due_at < now();
    $job$
  );
end;
$$;

-- Add loans to Supabase Realtime only if it is not already published.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loans'
  ) then
    alter publication supabase_realtime add table public.loans;
  end if;
end;
$$;
