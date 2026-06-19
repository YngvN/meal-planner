-- Grant full access on all public tables to the service_role.
-- In managed Supabase this happens automatically; on self-hosted the role
-- needs explicit GRANT statements because it is not a superuser.

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;
