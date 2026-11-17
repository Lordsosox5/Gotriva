-- Optional Wetriva demo data. First create two accounts in the app, then replace
-- these example emails with those accounts' email addresses before running.
-- The seed does not create or change Supabase Auth users or passwords.

with demo_people as (
  select
    (select id from auth.users where lower(email) = lower('demo-owner@example.com') limit 1) as owner_id,
    (select id from auth.users where lower(email) = lower('demo-borrower@example.com') limit 1) as borrower_id
)
insert into public.connections (user_id, friend_id, status)
select owner_id, borrower_id, 'accepted'
from demo_people
where owner_id is not null and borrower_id is not null and owner_id <> borrower_id
on conflict (user_id, friend_id) do update set status = 'accepted';

with demo_owner as (
  select id
  from auth.users
  where lower(email) = lower('demo-owner@example.com')
  limit 1
)
insert into public.items (owner_id, title, description, category, condition, is_available)
select id, 'كاميرا فورية', 'كاميرا صغيرة لالتقاط صور المناسبات والرحلات.', 'إلكترونيات', 'excellent', true
from demo_owner
where not exists (
  select 1 from public.items i
  where i.owner_id = demo_owner.id and i.title = 'كاميرا فورية'
);

with demo_owner as (
  select id
  from auth.users
  where lower(email) = lower('demo-owner@example.com')
  limit 1
)
insert into public.items (owner_id, title, description, category, condition, is_available)
select id, 'مثقاب كهربائي', 'مثقاب منزلي للاستخدامات البسيطة.', 'أدوات', 'good', true
from demo_owner
where not exists (
  select 1 from public.items i
  where i.owner_id = demo_owner.id and i.title = 'مثقاب كهربائي'
);

with demo_people as (
  select
    (select id from auth.users where lower(email) = lower('demo-owner@example.com') limit 1) as owner_id,
    (select id from auth.users where lower(email) = lower('demo-borrower@example.com') limit 1) as borrower_id
),
demo_item as (
  select i.id, i.owner_id
  from public.items i, demo_people p
  where i.owner_id = p.owner_id
    and i.title = 'كاميرا فورية'
    and p.borrower_id is not null
  limit 1
)
insert into public.loans (
  item_id, owner_id, borrower_id, status, duration_days, due_at
)
select
  demo_item.id,
  demo_item.owner_id,
  demo_people.borrower_id,
  'handed_over',
  7,
  now() + interval '3 days'
from demo_item
cross join demo_people
where not exists (
  select 1 from public.loans l
  where l.item_id = demo_item.id
    and l.borrower_id = demo_people.borrower_id
    and l.status in ('requested', 'accepted', 'handed_over', 'overdue')
);

update public.items i
set is_available = false
where i.title = 'كاميرا فورية'
  and exists (
    select 1 from public.loans l
    where l.item_id = i.id and l.status in ('handed_over', 'overdue')
  );
