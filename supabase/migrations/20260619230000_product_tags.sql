-- Add free-form tags to products for AI-assisted categorisation.
-- Examples: ["Condiment", "Sauce", "Ketchup"]

alter table products
  add column tags text[] not null default '{}';
