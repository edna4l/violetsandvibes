-- Backfill profile display fields used by NotificationCenter hydration.
-- Ensures actor names are available from profiles.

-- 1) Create missing profile rows for existing auth users.
insert into public.profiles (id, full_name, username, created_at, updated_at)
select
  u.id,
  nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), '') as full_name,
  nullif(
    coalesce(
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1)
    ),
    ''
  ) as username,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

-- 2) Backfill full_name when empty.
update public.profiles p
set
  full_name = nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ''),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (p.full_name is null or btrim(p.full_name) = '')
  and nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), '') is not null;

-- 3) Backfill username when empty.
update public.profiles p
set
  username = nullif(
    coalesce(
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1)
    ),
    ''
  ),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (p.username is null or btrim(p.username) = '')
  and nullif(
    coalesce(
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1)
    ),
    ''
  ) is not null;

-- 4) Final fallback so username is never empty for existing rows.
update public.profiles p
set
  username = 'user_' || left(replace(p.id::text, '-', ''), 8),
  updated_at = now()
where p.username is null or btrim(p.username) = '';
