-- Plan 10: Authentication, roles, and multi-user data isolation.
-- Run AFTER 20260618000000_init_schema.sql.
--
-- Adds:
--   profiles          — one row per auth.users row (auto-created via trigger)
--   app_settings      — single-row admin-controlled global config
--   invite_codes      — admin-created codes for invite-only signups
--
-- Alters:
--   ingredients / recipes   — add user_id + is_global
--   pantry_items            — PK widened to (user_id, ingredient_id)
--   planned_meals           — add user_id
--
-- Replaces the permissive "Allow all (single-user)" RLS policies with
-- scoped per-user policies on every table.

-- ─── profiles ─────────────────────────────────────────────────────────────────

create table profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  username              text unique not null,
  role                  text not null default 'user' check (role in ('admin', 'user')),
  ai_image_requests_used integer not null default 0,
  created_at            timestamptz not null default now()
);

alter table profiles enable row level security;

-- SECURITY DEFINER function so RLS policies can read the caller's role without
-- recursively triggering the policies on the profiles table itself.
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid()
$$;

-- Everyone can read any profile (needed for recipe attribution).
create policy "profiles_select_all" on profiles for select using (true);

-- A user may insert their own profile row (safety net if the trigger misses).
create policy "profiles_insert_own" on profiles for insert
  with check (auth.uid() = id);

-- A user may update their own row but cannot escalate their own role.
-- Uses get_my_role() to avoid infinite recursion in the policy expression.
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = get_my_role());

-- Admins can do anything to any profile row (including changing roles).
create policy "profiles_admin_all" on profiles for all
  using (get_my_role() = 'admin');

-- ─── Trigger: auto-create profile on signup ────────────────────────────────────
-- The first user to register becomes 'admin'; all subsequent users are 'user'.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    case when (select count(*) from profiles) = 0 then 'admin' else 'user' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── app_settings ─────────────────────────────────────────────────────────────

create table app_settings (
  id                          integer primary key default 1 check (id = 1),
  max_users                   integer default null,           -- null = unlimited
  require_invite_code         boolean not null default false,
  ai_image_requests_per_user  integer not null default 10
);

-- Seed the single row.
insert into app_settings default values;

alter table app_settings enable row level security;

create policy "app_settings_read" on app_settings for select using (true);
create policy "app_settings_admin_write" on app_settings for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- ─── invite_codes ─────────────────────────────────────────────────────────────

create table invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  used_by    uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table invite_codes enable row level security;

-- Admins have full access.
create policy "invite_codes_admin" on invite_codes for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Anyone (including unauthenticated callers) may read unused codes to validate
-- an invite code entered during signup before auth.uid() is known.
create policy "invite_codes_validate" on invite_codes for select
  using (used_by is null);

-- ─── ingredients: add ownership + visibility ──────────────────────────────────

alter table ingredients
  add column user_id   uuid references profiles (id) on delete set null,
  add column is_global boolean not null default true;

-- Drop the single-user catch-all policy.
drop policy if exists "Allow all (single-user)" on ingredients;

-- Read: global rows OR own private rows.
create policy "ingredients_read" on ingredients for select
  using (is_global or user_id = auth.uid());

-- Insert: any authenticated user may add an ingredient.
create policy "ingredients_insert" on ingredients for insert
  with check (auth.uid() is not null);

-- Update/delete: own rows OR admin.
create policy "ingredients_update" on ingredients for update
  using (user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin');

create policy "ingredients_delete" on ingredients for delete
  using (user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin');

-- ingredient_subproducts inherits access via cascade from the parent ingredient.
drop policy if exists "Allow all (single-user)" on ingredient_subproducts;

create policy "subproducts_read" on ingredient_subproducts for select
  using (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_subproducts.ingredient_id
        and (i.is_global or i.user_id = auth.uid())
    )
  );

create policy "subproducts_write" on ingredient_subproducts for all
  using (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_subproducts.ingredient_id
        and (i.user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin')
    )
  );

-- ─── recipes: same pattern + attribution ──────────────────────────────────────

alter table recipes
  add column user_id              uuid references profiles (id) on delete set null,
  add column is_global            boolean not null default true,
  -- Denormalised creator username for display without an extra join.
  add column created_by_username  text;

drop policy if exists "Allow all (single-user)" on recipes;
drop policy if exists "Allow all (single-user)" on recipe_ingredients;

create policy "recipes_read" on recipes for select
  using (is_global or user_id = auth.uid());

create policy "recipes_insert" on recipes for insert
  with check (auth.uid() is not null);

create policy "recipes_update" on recipes for update
  using (user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin');

create policy "recipes_delete" on recipes for delete
  using (user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin');

-- recipe_ingredients inherits access via the parent recipe.
create policy "recipe_ingredients_read" on recipe_ingredients for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and (r.is_global or r.user_id = auth.uid())
    )
  );

create policy "recipe_ingredients_write" on recipe_ingredients for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and (r.user_id = auth.uid() or (select role from profiles where id = auth.uid()) = 'admin')
    )
  );

-- ─── pantry_items: per-user (PK: user_id + ingredient_id) ────────────────────

-- 1. Drop the trigger that keeps updated_at current (it references the old PK).
drop trigger if exists pantry_items_set_updated_at on pantry_items;

-- 2. Add user_id column (nullable initially so the PK alter succeeds).
alter table pantry_items add column user_id uuid references profiles (id) on delete cascade;

-- 3. Assign existing rows to the first admin (safe on a fresh/test database).
update pantry_items
set user_id = (select id from profiles where role = 'admin' order by created_at limit 1)
where user_id is null;

-- 4. Widen the primary key.
alter table pantry_items drop constraint pantry_items_pkey;
alter table pantry_items add primary key (user_id, ingredient_id);
alter table pantry_items alter column user_id set not null;

-- 5. Restore the updated_at trigger.
create trigger pantry_items_set_updated_at
  before update on pantry_items
  for each row execute function set_updated_at();

-- 6. Replace the permissive policy.
drop policy if exists "Allow all (single-user)" on pantry_items;

create policy "pantry_own" on pantry_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── planned_meals: per-user ──────────────────────────────────────────────────

alter table planned_meals add column user_id uuid references profiles (id) on delete cascade;

update planned_meals
set user_id = (select id from profiles where role = 'admin' order by created_at limit 1)
where user_id is null;

alter table planned_meals alter column user_id set not null;

drop policy if exists "Allow all (single-user)" on planned_meals;

create policy "planned_meals_own" on planned_meals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
