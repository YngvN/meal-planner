-- Backfill a profiles row for any auth.users that were created before the
-- on_auth_user_created trigger existed (migration 20260619000000_auth_roles_multiuser).
-- The first user (by created_at) becomes admin; the rest become 'user'.

insert into profiles (id, username, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  case when u.created_at = min(u.created_at) over () then 'admin' else 'user' end
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id)
on conflict (id) do nothing;
