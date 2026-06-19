-- Allow authenticated users to add products to global ingredients.
-- The original policy required i.user_id = auth.uid(), which blocked writes
-- on global (shared) ingredients that have user_id = null.

drop policy if exists "products_write" on products;

create policy "products_write" on products for all
  using (
    exists (
      select 1 from ingredients i
      where i.id = products.ingredient_id
        and (i.is_global or i.user_id = auth.uid() or get_my_role() = 'admin')
    )
  );
