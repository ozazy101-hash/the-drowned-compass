-- Additive accepted progress per private family and canonical cell geography.
-- No undo history, artwork bytes, physical calibration or second presentation ledger.
create function public.map_reveal_geometry(p_document jsonb,p_background jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('columns',p_document->'columns','rows',p_document->'rows','feetPerSquare',p_document->'feetPerSquare','background',case when p_background is null then null else jsonb_build_object('registration',p_background->'registration','x',p_background->'x','y',p_background->'y','width',p_background->'width','height',p_background->'height','pixelWidth',p_background->'pixelWidth','pixelHeight',p_background->'pixelHeight') end);
$$;
create function public.valid_map_reveal_mask(p_mask jsonb,p_family uuid,p_geometry jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare total integer;cell jsonb;
begin
 if p_mask is null or jsonb_typeof(p_mask)<>'object' or p_family is null or p_geometry is null or not public.valid_grid_map_document(jsonb_build_object('columns',p_geometry->'columns','rows',p_geometry->'rows','feetPerSquare',p_geometry->'feetPerSquare','terrain','[]'::jsonb,'edges','[]'::jsonb)) then return false;end if;
 if coalesce(p_mask->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or p_mask->>'registration' is distinct from coalesce(p_geometry->'background'->>'registration','drawing:'||p_family::text) or p_mask->'columns' is distinct from p_geometry->'columns' or p_mask->'rows' is distinct from p_geometry->'rows' or jsonb_typeof(p_mask->'uncovered') is distinct from 'array' then return false;end if;
 total=(p_geometry->>'columns')::integer*(p_geometry->>'rows')::integer;
 for cell in select value from jsonb_array_elements(p_mask->'uncovered') loop
  if jsonb_typeof(cell)<>'number' or cell::text !~ '^[0-9]+$' or cell::numeric>=total then return false;end if;
 end loop;
 return (select count(*)=count(distinct value) from jsonb_array_elements(p_mask->'uncovered'));
exception when others then return false;
end;$$;
create table public.party_map_reveal_masks (
 party_id uuid not null references public.parties(id),family_id uuid not null references public.party_grid_maps(id),
 geometry jsonb not null,mask jsonb not null,primary key(party_id,family_id,geometry),
 check(public.valid_map_reveal_mask(mask,family_id,geometry))
);
alter table public.party_map_reveal_masks enable row level security;
revoke all on public.party_map_reveal_masks from anon,authenticated;
grant select on public.party_map_reveal_masks to authenticated;
create policy "DM reads accepted private reveal progress" on public.party_map_reveal_masks for select to authenticated using(public.is_party_dm(party_id));
-- Retain valid pre-migration progress; malformed historical masks are never
-- reinterpreted. Existing client snapshot validation leaves malformed state black.
insert into public.party_map_reveal_masks(party_id,family_id,geometry,mask)
select p.party_id,v.family_id,public.map_reveal_geometry(v.document,v.background),p.mask
from public.party_map_presentations p join public.party_map_artwork_versions v on v.id=p.version_id and v.party_id=p.party_id
where public.valid_map_reveal_mask(p.mask,v.family_id,public.map_reveal_geometry(v.document,v.background));
create function public.guard_map_reveal_presentation() returns trigger language plpgsql security definer set search_path='' as $$
declare v public.party_map_artwork_versions;
begin
 select * into v from public.party_map_artwork_versions where id=new.version_id and party_id=new.party_id;
 if not found or not public.valid_map_reveal_mask(new.mask,v.family_id,public.map_reveal_geometry(v.document,v.background)) then raise exception 'Invalid accepted Reveal Mask';end if;
 return new;
end;$$;
create trigger guard_map_reveal_presentation before insert or update on public.party_map_presentations for each row execute function public.guard_map_reveal_presentation();
create function public.commit_map_reveal_mask(p_request uuid,p_expected_revision integer,p_family uuid,p_mask uuid,p_geometry jsonb,p_uncovered jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;p public.party_map_presentations;v public.party_map_artwork_versions;r public.party_map_presentation_requests;s jsonb;accepted_mask jsonb;result jsonb;sorted jsonb;
begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access is required' using errcode='42501';end if;
 if p_request is null or p_expected_revision is null or p_expected_revision<1 or p_family is null or p_mask is null or p_geometry is null then raise exception 'Invalid reveal request';end if;
 accepted_mask=jsonb_build_object('id',p_mask,'registration',coalesce(p_geometry->'background'->>'registration','drawing:'||p_family::text),'columns',p_geometry->'columns','rows',p_geometry->'rows','uncovered',p_uncovered);
 if not public.valid_map_reveal_mask(accepted_mask,p_family,p_geometry) then raise exception 'Invalid Reveal Mask';end if;
 select coalesce(jsonb_agg(value order by value::integer),'[]'::jsonb) into sorted from jsonb_array_elements(p_uncovered);
 s=jsonb_build_object('kind','mask','familyId',p_family,'maskId',p_mask,'expectedRevision',p_expected_revision,'geometry',p_geometry,'uncovered',sorted);
 perform pg_advisory_xact_lock(hashtextextended('map-presentation-request/'||p_request::text,0));
 select * into r from public.party_map_presentation_requests where request_id=p_request;
 if found then
  if r.party_id<>target or r.signature<>s then raise exception 'Presentation request already used';end if;
  return jsonb_build_object('ok',true,'presentation',r.presentation);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('map-presentation/'||target::text,0));
 select * into p from public.party_map_presentations where party_id=target for update;
 if coalesce(p.revision,0)<>p_expected_revision then return jsonb_build_object('ok',false,'reason','conflict','presentation',public.map_presentation_snapshot(target));end if;
 select * into v from public.party_map_artwork_versions where id=p.version_id and party_id=target;
 if not found or v.family_id<>p_family or p.mask->>'id' is distinct from p_mask::text or public.map_reveal_geometry(v.document,v.background)<>p_geometry then return jsonb_build_object('ok',false,'reason','incompatible','presentation',public.map_presentation_snapshot(target));end if;
 accepted_mask=accepted_mask||jsonb_build_object('uncovered',sorted);
 update public.party_map_presentations set revision=revision+1,mask=accepted_mask where party_id=target;
 insert into public.party_map_reveal_masks(party_id,family_id,geometry,mask) values(target,p_family,p_geometry,accepted_mask)
 on conflict(party_id,family_id,geometry) do update set mask=excluded.mask;
 result=public.map_presentation_snapshot(target);
 insert into public.party_map_presentation_requests values(p_request,target,s,result);
 return jsonb_build_object('ok',true,'presentation',result);
end;$$;
create or replace function public.choose_map_presentation(p_version text,p_expected_revision integer,p_request uuid,p_new_map boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;v public.party_map_artwork_versions;previous public.party_map_artwork_versions;p public.party_map_presentations;r public.party_map_presentation_requests;s jsonb;mask jsonb;compatible boolean=false;result jsonb;
begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access is required' using errcode='42501';end if;
 if p_request is null or p_expected_revision is null or p_expected_revision<0 or p_new_map is null then raise exception 'Invalid presentation request';end if;
 s=jsonb_build_object('version',p_version,'expectedRevision',p_expected_revision,'newMap',p_new_map);
 perform pg_advisory_xact_lock(hashtextextended('map-presentation-request/'||p_request::text,0));
 select * into r from public.party_map_presentation_requests where request_id=p_request;
 if found then
  if r.party_id<>target or r.signature<>s then raise exception 'Presentation request already used';end if;
  return jsonb_build_object('ok',true,'presentation',r.presentation);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('map-presentation/'||target::text,0));
 select * into p from public.party_map_presentations where party_id=target for update;
 if coalesce(p.revision,0)<>p_expected_revision then return jsonb_build_object('ok',false,'reason','conflict','presentation',public.map_presentation_snapshot(target));end if;
 select * into v from public.party_map_artwork_versions where id=p_version and party_id=target;
 if not found then raise exception 'Saved version unavailable';end if;
 if p.version_id is not null then
  select * into previous from public.party_map_artwork_versions where id=p.version_id;
  compatible=previous.family_id=v.family_id and previous.document->'columns'=v.document->'columns' and previous.document->'rows'=v.document->'rows' and previous.document->'feetPerSquare'=v.document->'feetPerSquare' and (
   (previous.background is null and v.background is null) or (previous.background is not null and v.background is not null and previous.background->'registration'=v.background->'registration' and (previous.background-'digest'-'object_id'-'mime'-'size')=(v.background-'digest'-'object_id'-'mime'-'size')));
  if not coalesce(compatible,false) and not p_new_map then return jsonb_build_object('ok',false,'reason','incompatible','presentation',public.map_presentation_snapshot(target));end if;
 end if;
 -- Save current family before any deliberate switch, then restore only the
 -- exact canonical target key. Artwork/version changes and masks remain atomic.
 if p.version_id is not null then
  insert into public.party_map_reveal_masks(party_id,family_id,geometry,mask) values(target,previous.family_id,public.map_reveal_geometry(previous.document,previous.background),p.mask)
  on conflict(party_id,family_id,geometry) do update set mask=excluded.mask;
 end if;
 select progress.mask into mask from public.party_map_reveal_masks progress where progress.party_id=target and progress.family_id=v.family_id and progress.geometry=public.map_reveal_geometry(v.document,v.background);
 mask=coalesce(mask,case when compatible then p.mask else jsonb_build_object('id',p_request,'registration',coalesce(v.background->>'registration','drawing:'||v.family_id::text),'columns',v.document->'columns','rows',v.document->'rows','uncovered','[]'::jsonb) end);
 insert into public.party_map_presentations(party_id,revision,version_id,mask) values(target,coalesce(p.revision,0)+1,v.id,mask) on conflict(party_id) do update set revision=excluded.revision,version_id=excluded.version_id,mask=excluded.mask;
 result=public.map_presentation_snapshot(target);
 insert into public.party_map_presentation_requests values(p_request,target,s,result);
 return jsonb_build_object('ok',true,'presentation',result);
end;$$;
revoke all on function public.map_reveal_geometry(jsonb,jsonb),public.valid_map_reveal_mask(jsonb,uuid,jsonb),public.guard_map_reveal_presentation(),public.commit_map_reveal_mask(uuid,integer,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_map_reveal_mask(uuid,integer,uuid,uuid,jsonb,jsonb) to authenticated;
-- Validating table CHECK functions are callable only by trusted writers; all
-- browser mutations go through the authorized semantic commands above.
