-- Grant admin bypass privileges to the founder/admin account.
-- Safe to run multiple times.

do $$
declare
  v_user_id uuid;
begin
  if to_regclass('public.admin_roles') is null then
    raise exception 'public.admin_roles is missing. Run 20260227_ensure_admin_roles_table.sql first.';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower('ednaojeda@gmail.com')
  order by u.created_at asc
  limit 1;

  if v_user_id is null then
    raise notice 'Admin bypass not granted: user % does not exist yet.', 'ednaojeda@gmail.com';
    return;
  end if;

  insert into public.admin_roles (user_id, role, permissions)
  values (
    v_user_id,
    'owner',
    jsonb_build_object(
      'admin_bypass', true,
      'verification_bypass', true,
      'granted_by', 'migration:20260227_grant_admin_bypass_ednaojeda'
    )
  )
  on conflict (user_id)
  do update
  set role = excluded.role,
      permissions = coalesce(public.admin_roles.permissions, '{}'::jsonb) || excluded.permissions,
      updated_at = now();
end
$$;
