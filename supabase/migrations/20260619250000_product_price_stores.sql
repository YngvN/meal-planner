-- Crowd-sourced product prices with moderation, and store availability on products.

-- ─── stores on products ────────────────────────────────────────────────────────

alter table products
  add column stores text[] not null default '{}';

-- ─── price change ban on profiles ─────────────────────────────────────────────

alter table profiles
  add column price_change_banned_until timestamptz;

-- ─── product_price_reports ────────────────────────────────────────────────────
-- Each row is one user-submitted price for a (product, store) pair.
-- Status lifecycle: active → pending_review → approved | rejected
-- (direct reports below the 50% increase threshold start as 'active')

create table product_price_reports (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  reported_by   uuid not null references profiles(id),
  store_name    text not null,
  price         numeric not null check (price > 0),
  currency      text not null default 'NOK',
  status        text not null default 'active'
                check (status in ('active', 'pending_review', 'approved', 'rejected')),
  ai_verdict    text,           -- brief reason from AI moderation
  reviewed_by   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index product_price_reports_product_idx on product_price_reports (product_id);
create index product_price_reports_status_idx  on product_price_reports (status);

alter table product_price_reports enable row level security;

-- Everyone can read price reports.
create policy "price_reports_read" on product_price_reports
  for select using (true);

-- Authenticated users can insert, unless they are price-banned.
create policy "price_reports_insert" on product_price_reports
  for insert
  with check (
    auth.uid() = reported_by
    and (
      select price_change_banned_until is null or price_change_banned_until < now()
      from profiles where id = auth.uid()
    )
  );

-- Only admins can update (to change status, ai_verdict, reviewed_by).
create policy "price_reports_admin_update" on product_price_reports
  for update
  using (get_my_role() = 'admin');

grant select                     on public.product_price_reports to anon, authenticated;
grant insert                     on public.product_price_reports to authenticated;
grant update                     on public.product_price_reports to authenticated;
grant all                        on public.product_price_reports to service_role;

-- ─── current prices view ──────────────────────────────────────────────────────
-- Shows the latest active/approved report per (product, store).

create view product_current_prices as
  select distinct on (product_id, store_name)
    id,
    product_id,
    store_name,
    price,
    currency,
    reported_by,
    created_at
  from product_price_reports
  where status in ('active', 'approved')
  order by product_id, store_name, created_at desc;

grant select on public.product_current_prices to anon, authenticated, service_role;
