-- Atomic lifecycle commands reuse saved map receipts and immutable backgrounds.
create function public.change_party_grid_map(p_id uuid,p_expected_version integer,p_request_id uuid,p_kind text,p_copy_id uuid,p_title text,p_client_signature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_party uuid; item public.party_grid_maps; accepted public.party_grid_map_requests; signature jsonb;
begin
 select party_id into target_party from public.party_members where user_id=(select auth.uid()) and role='dungeon-master';
 if target_party is null then raise exception 'Dungeon Master access is required to change Grid Maps' using errcode='42501';end if;
 if p_id is null or p_request_id is null or p_expected_version is null or p_expected_version<1 or p_kind is null or p_kind not in('copy','reveal','withdraw') or p_client_signature is null then raise exception 'Invalid Grid Map change';end if;
 if p_kind='copy' then
  if p_copy_id is null or p_copy_id=p_id or p_title is null or char_length(btrim(p_title)) not between 1 and 160 then raise exception 'Invalid Grid Map copy';end if;
 elsif p_copy_id is not null or p_title is not null then raise exception 'Unexpected Grid Map copy fields';end if;
 signature=jsonb_build_object('id',p_id,'expectedVersion',p_expected_version,'kind',p_kind,'copyId',p_copy_id,'title',case when p_kind='copy' then btrim(p_title) end);
 perform pg_advisory_xact_lock(hashtextextended('grid-request/'||p_request_id::text,0));
 select * into accepted from public.party_grid_map_requests where request_id=p_request_id;
 if found then
  if accepted.party_id<>target_party or accepted.signature<>signature or accepted.client_signature<>p_client_signature then raise exception 'This change request was already used for different content';end if;
  return jsonb_build_object('ok',true,'item',accepted.item);
 end if;
 -- Lock both identities in deterministic order, also coordinating with save.
 perform pg_advisory_xact_lock(hashtextextended('grid-map/'||least(p_id::text,coalesce(p_copy_id,p_id)::text),0));
 if p_copy_id is not null then perform pg_advisory_xact_lock(hashtextextended('grid-map/'||greatest(p_id::text,p_copy_id::text),0));end if;
 select * into item from public.party_grid_maps where id=p_id for update;
 if not found or item.party_id<>target_party then raise exception 'Grid Map is unavailable' using errcode='42501';end if;
 if item.version<>p_expected_version then return jsonb_build_object('ok',false,'item',to_jsonb(item));end if;
 if p_kind='copy' then
  -- Copy accepted data only; never use client-supplied geometry/background.
  if exists(select 1 from public.party_grid_maps where id=p_copy_id) or exists(select 1 from public.party_handouts where id=p_copy_id) then raise exception 'This content identity is already used';end if;
  insert into public.party_grid_maps(id,party_id,title,visibility,version,document,background) values(p_copy_id,target_party,btrim(p_title),'private',1,item.document,item.background) returning * into item;
 else
  update public.party_grid_maps set visibility=case p_kind when 'reveal' then 'revealed' else 'private' end,version=version+1 where id=p_id returning * into item;
 end if;
 insert into public.party_grid_map_requests(request_id,party_id,map_id,signature,client_signature,item) values(p_request_id,target_party,item.id,signature,p_client_signature,to_jsonb(item));
 return jsonb_build_object('ok',true,'item',to_jsonb(item));
end;$$;
revoke all on function public.change_party_grid_map(uuid,integer,uuid,text,uuid,text,text) from public;
grant execute on function public.change_party_grid_map(uuid,integer,uuid,text,uuid,text,text) to authenticated;
-- Realtime notifications carry no private row data to unauthorized subscribers;
-- the content capability always reloads through RLS before rendering.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_grid_maps') then alter publication supabase_realtime add table public.party_grid_maps;end if;
end;$$;
