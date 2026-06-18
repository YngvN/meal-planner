-- Meal Planner — initial schema
-- Mirrors the app's TypeScript data model (src/features/*/types.ts).
--
-- Conventions:
--   * snake_case columns (the API layer maps to the camelCase TS types).
--   * Document-like nested data (nutrition, i18n maps, instruction steps,
--     source attribution) is stored as JSONB.
--   * Ingredient/recipe relations, pantry, and the meal plan are normalised
--     into their own tables with foreign keys.
--
-- Single-tenant for now. To make it multi-user later: add `user_id uuid
-- references auth.users` to each root table and tighten the RLS policies below.

-- gen_random_uuid() lives in pgcrypto (bundled with Supabase/Postgres).
create extension if not exists "pgcrypto";

-- ─── Enum types ───────────────────────────────────────────────────────────────

create type ingredient_category as enum (
  'produce', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'bakery', 'beverages', 'other'
);

create type skill_level as enum ('beginner', 'intermediate', 'advanced');

create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ─── updated_at trigger helper ──────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Ingredients ────────────────────────────────────────────────────────────────

create table ingredients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            ingredient_category not null default 'other',
  -- { calories, protein, carbs, fat, fiber } per 100 g/ml
  nutrition           jsonb,
  -- Typical shelf life in days; used to auto-set pantry expiry.
  default_expiry_days integer check (default_expiry_days is null or default_expiry_days >= 0),
  image_url           text,
  -- Grams per ml — enables volume <-> weight conversion.
  density             numeric check (density is null or density > 0),
  -- Translated names keyed by language code, e.g. { "en": "Garlic", "no": "Hvitløk" }
  name_i18n           jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger ingredients_set_updated_at
  before update on ingredients
  for each row execute function set_updated_at();

-- Named variants of an ingredient (e.g. salted vs unsalted butter).
create table ingredient_subproducts (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients (id) on delete cascade,
  name          text not null,
  nutrition     jsonb,
  image_url     text,
  name_i18n     jsonb not null default '{}'::jsonb,
  position      integer not null default 0
);

create index ingredient_subproducts_ingredient_id_idx
  on ingredient_subproducts (ingredient_id);

-- ─── Recipes ──────────────────────────────────────────────────────────────────

create table recipes (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text not null default '',
  portions           integer not null default 1 check (portions > 0),
  prep_time_minutes  integer not null default 0 check (prep_time_minutes >= 0),
  cook_time_minutes  integer not null default 0 check (cook_time_minutes >= 0),
  skill_level        skill_level not null default 'beginner',
  -- Free-form / tag arrays.
  cuisine_types      text[] not null default '{}',
  dietary_tags       text[] not null default '{}',
  seasonal_tags      text[] not null default '{}',
  meal_tags          text[] not null default '{}',
  tags               text[] not null default '{}',
  equipment          text[] not null default '{}',
  -- Ordered steps: [{ "order": 1, "description": "...", "timerMinutes": 5 }, ...]
  instructions       jsonb not null default '[]'::jsonb,
  -- Optional manual per-serving nutrition (else calculated from ingredients).
  nutrition          jsonb,
  cost_estimate      numeric check (cost_estimate is null or cost_estimate >= 0),
  notes              text,
  -- { "type": "website"|"book"|"person", "name": "...", "url": "..." }
  source             jsonb,
  is_favorite        boolean not null default false,
  image_url          text,
  -- Per-language translation maps.
  title_i18n         jsonb not null default '{}'::jsonb,
  description_i18n   jsonb not null default '{}'::jsonb,
  notes_i18n         jsonb not null default '{}'::jsonb,
  -- { "no": ["steg 1", "steg 2", ...] } parallel to instructions order.
  instructions_i18n  jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

create index recipes_is_favorite_idx on recipes (is_favorite) where is_favorite;

-- One row per ingredient line in a recipe (references the global library).
create table recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id) on delete restrict,
  subproduct_id uuid references ingredient_subproducts (id) on delete set null,
  quantity      numeric not null check (quantity >= 0),
  unit          text not null,
  position      integer not null default 0
);

create index recipe_ingredients_recipe_id_idx on recipe_ingredients (recipe_id);
create index recipe_ingredients_ingredient_id_idx on recipe_ingredients (ingredient_id);

-- ─── Pantry ─────────────────────────────────────────────────────────────────────

-- One row per ingredient the user tracks.
create table pantry_items (
  ingredient_id uuid primary key references ingredients (id) on delete cascade,
  in_stock      boolean not null default false,
  quantity      numeric check (quantity is null or quantity >= 0),
  unit          text,
  is_low        boolean not null default false,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create trigger pantry_items_set_updated_at
  before update on pantry_items
  for each row execute function set_updated_at();

create index pantry_items_in_stock_idx on pantry_items (in_stock) where in_stock;

-- ─── Meal plan ──────────────────────────────────────────────────────────────────

create table planned_meals (
  id        uuid primary key default gen_random_uuid(),
  date      date not null,
  slot      meal_slot not null,
  recipe_id uuid not null references recipes (id) on delete cascade,
  -- Optional override of the recipe's default portion count.
  portions  integer check (portions is null or portions > 0),
  created_at timestamptz not null default now()
);

create index planned_meals_date_idx on planned_meals (date);
create index planned_meals_recipe_id_idx on planned_meals (recipe_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────────
-- Supabase exposes tables through PostgREST. Enabling RLS without policies blocks
-- all access, so we add permissive policies for a single-user/local setup.
-- TIGHTEN THESE before exposing the database to multiple users (scope by user_id).

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'ingredients', 'ingredient_subproducts', 'recipes',
    'recipe_ingredients', 'pantry_items', 'planned_meals'
  ]
  loop
    execute format('alter table %I enable row level security;', tbl);
    execute format(
      'create policy "Allow all (single-user)" on %I for all using (true) with check (true);',
      tbl
    );
  end loop;
end $$;
