-- Plan 11: Replace ingredient_subproducts with a richer products table.
--
-- SubProducts (unnamed variants) become Products — specific branded items with
-- barcode, brand name, and own nutrition. Pantry gains product-level tracking.
--
-- Run AFTER 20260619000000_auth_roles_multiuser.sql.

-- ─── products table ────────────────────────────────────────────────────────────

create table products (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references ingredients (id) on delete cascade,
  name           text not null,
  brand          text,
  barcode        text,
  barcode_format text,          -- EAN_13, UPC_A, QR_CODE, etc.
  nutrition      jsonb,         -- per 100 g/ml: { calories, protein, carbs, fat, fiber }
  image_url      text,
  name_i18n      jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Barcode must be unique when present (NULL is allowed for unscanned products).
create unique index products_barcode_idx  on products (barcode) where barcode is not null;
create        index products_ingredient_idx on products (ingredient_id);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

alter table products enable row level security;

-- Read: product is visible if the parent ingredient is visible.
create policy "products_read" on products for select
  using (
    exists (
      select 1 from ingredients i
      where i.id = products.ingredient_id
        and (i.is_global or i.user_id = auth.uid())
    )
  );

-- Write: only owner of parent ingredient (or admin).
create policy "products_write" on products for all
  using (
    exists (
      select 1 from ingredients i
      where i.id = products.ingredient_id
        and (i.user_id = auth.uid() or get_my_role() = 'admin')
    )
  );

grant select                     on public.products to anon, authenticated;
grant insert, update, delete     on public.products to authenticated;

-- ─── Migrate subproducts data ──────────────────────────────────────────────────

insert into products (id, ingredient_id, name, nutrition, image_url, name_i18n)
select id, ingredient_id, name, nutrition, image_url, name_i18n
from ingredient_subproducts;

drop table ingredient_subproducts;

-- ─── recipe_ingredients: subproduct_id → product_id ───────────────────────────

alter table recipe_ingredients rename column subproduct_id to product_id;

alter table recipe_ingredients
  drop constraint if exists recipe_ingredients_subproduct_id_fkey;

alter table recipe_ingredients
  add constraint recipe_ingredients_product_id_fkey
  foreign key (product_id) references products (id) on delete set null;

-- ─── pantry_items: add product-level tracking ─────────────────────────────────

-- Drop the composite PK (user_id, ingredient_id) and replace with a
-- surrogate key so a user can track multiple products for the same ingredient.
drop trigger if exists pantry_items_set_updated_at on pantry_items;

alter table pantry_items drop constraint pantry_items_pkey;

alter table pantry_items
  add column id         uuid default gen_random_uuid(),
  add column product_id uuid references products (id) on delete set null;

alter table pantry_items add primary key (id);

-- Uniqueness rules that handle NULL correctly with partial indexes:
-- At most one "category-level" row (no product) per user+ingredient.
create unique index pantry_category_unique
  on pantry_items (user_id, ingredient_id)
  where product_id is null;

-- At most one row per user+product.
create unique index pantry_product_unique
  on pantry_items (user_id, product_id)
  where product_id is not null;

-- Re-add the updated_at trigger.
create trigger pantry_items_set_updated_at
  before update on pantry_items
  for each row execute function set_updated_at();
