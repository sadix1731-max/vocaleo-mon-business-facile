
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.seed_demo_organization() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.seed_demo_organization() TO authenticated;
