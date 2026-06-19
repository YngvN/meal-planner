-- Add support for ingredient alternatives within a recipe.
-- An alternative row points to its primary recipe_ingredient via alternative_for.
-- Null = primary ingredient; non-null = substitute for that primary.

alter table recipe_ingredients
  add column alternative_for uuid references recipe_ingredients(id) on delete cascade;
