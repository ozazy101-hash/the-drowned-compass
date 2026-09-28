-- CHECK constraints run these pure validators with the caller's permissions.
-- Hosted projects do not necessarily share the local CLI's default grants.
-- Grant explicitly so authenticated claims and Overview updates can validate.
revoke all on function public.valid_saving_throw_proficiencies(jsonb) from public, anon;
revoke all on function public.valid_skill_proficiencies(jsonb) from public, anon;
revoke all on function public.valid_overview_field_versions(jsonb) from public, anon;

grant execute on function public.valid_saving_throw_proficiencies(jsonb) to authenticated;
grant execute on function public.valid_skill_proficiencies(jsonb) to authenticated;
grant execute on function public.valid_overview_field_versions(jsonb) to authenticated;
