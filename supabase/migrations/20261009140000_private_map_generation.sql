-- Sole durable generation ledger. No browser writes, proof reads or paid defaults.
create table public.party_map_generation_settings (
 party_id uuid primary key references public.parties(id) on delete cascade,
 live_enabled boolean not null default false, fixture_enabled boolean not null default false,
 quota integer not null default 0 check(quota>=0), spend_cents integer not null default 0 check(spend_cents>=0),
 reservation_cents integer not null default 0 check(reservation_cents>=0),
 concurrency integer not null default 1 check(concurrency=1),
 wait_seconds integer not null default 120 check(wait_seconds between 1 and 120),
 retention_seconds integer not null default 86400 check(retention_seconds=86400)
);
create table public.party_map_generation_jobs (
 id uuid primary key, party_id uuid not null references public.parties(id) on delete cascade,
 user_id uuid not null references auth.users(id), intent jsonb not null, mode text not null check(mode in('live','fixture')),
 state text not null check(state in('queued','running','uncertain','awaiting-client-output','completed','failed','cancelled')),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 deadline timestamptz not null, provider_finished_at timestamptz, reserved_cents integer not null default 0 check(reserved_cents>=0),
 submission_token uuid, orphan_released boolean not null default false, cleanup_complete boolean not null default false, binding jsonb not null, candidate jsonb, proof jsonb, provisional jsonb, result jsonb, code text,
 check(candidate is null or candidate->>'objectId' is not null),
 check(provisional is null or provisional->>'objectId'=id::text)
);
alter table public.party_map_generation_settings enable row level security;
alter table public.party_map_generation_jobs enable row level security;
revoke all on public.party_map_generation_settings,public.party_map_generation_jobs from anon,authenticated;
revoke all on public.party_map_generation_settings,public.party_map_generation_jobs from service_role;
grant select on public.party_map_generation_settings,public.party_map_generation_jobs to service_role;
-- Reads are a projection: source object names and prepared proofs never cross it.
create function public.map_generation_snapshot(j public.party_map_generation_jobs) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',j.id,'familyId',j.intent->>'familyId','state',j.state,'revision',j.revision,'mode',j.mode,'createdAt',j.created_at,'code',j.code,'versionId',case when j.state='completed' then j.id::text end,'parentVersionId',j.intent->>'parentVersionId');
$$;
create function public.read_map_generation_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(public.map_generation_snapshot(j) order by j.created_at desc) from public.party_map_generation_jobs j where party_id=target),'[]');
end;$$;
create function public.reserve_map_generation(p_user uuid,p_intent jsonb,p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;cfg public.party_map_generation_settings;j public.party_map_generation_jobs;parent public.party_map_artwork_versions;m public.party_grid_maps;b jsonb;rid uuid;doc jsonb;n integer;spent integer;region jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server authority required' using errcode='42501';end if;
 select party_id into target from public.party_members where user_id=p_user and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access required' using errcode='42501';end if;
 rid=(p_intent->>'requestId')::uuid;
 if p_intent->>'kind' not in('generate','reference','revise') or rid is null or p_intent->>'familyId' is null or length(btrim(p_intent->>'title')) not between 1 and 160 or length(btrim(p_intent->>'instructions')) not between 1 and 8000 or (p_intent->>'expectedVersion')::integer<0 or p_mode not in('live','fixture') then raise exception 'Invalid generation intent';end if;
 perform pg_advisory_xact_lock(hashtextextended('map-generation/'||target,0));
 select * into j from public.party_map_generation_jobs where id=rid;
 if found then
  if j.party_id<>target or j.intent<>p_intent or j.mode<>p_mode then raise exception 'Request identity already used';end if;
  return to_jsonb(j); -- no retry can reserve/submit a second known request
 end if;
 select * into cfg from public.party_map_generation_settings where party_id=target;
 if not found or (p_mode='live' and not cfg.live_enabled) or (p_mode='fixture' and not cfg.fixture_enabled) then raise exception 'Generation disabled';end if;
 select count(*),coalesce(sum(reserved_cents),0) into n,spent from public.party_map_generation_jobs where party_id=target and mode=p_mode;
 if n>=cfg.quota or (p_mode='live' and (cfg.reservation_cents<=0 or spent+cfg.reservation_cents>cfg.spend_cents)) then raise exception 'Generation limit reached';end if;
 -- Unknown paid outcome retains its reservation AND concurrency slot until reconciled.
 if exists(select 1 from public.party_map_generation_jobs where party_id=target and (state in('queued','running','uncertain','awaiting-client-output') or (state='cancelled' and deadline>now()))) then raise exception 'Generation already active';end if;
 select * into m from public.party_grid_maps where id=(p_intent->>'familyId')::uuid;
 if found and (m.party_id<>target or m.version<>(p_intent->>'expectedVersion')::integer) then raise exception 'Map revision conflict';end if;
 if not found and (p_intent->>'expectedVersion')::integer<>0 then raise exception 'Map unavailable';end if;
 if p_intent->>'parentVersionId' is not null then
  select * into parent from public.party_map_artwork_versions where id=p_intent->>'parentVersionId' and family_id=(p_intent->>'familyId')::uuid and party_id=target;
  if not found then raise exception 'Saved parent unavailable';end if;
  doc=parent.document;
 else doc=p_intent->'document';end if;
 if not public.valid_grid_map_document(doc) then raise exception 'Invalid Map Grid';end if;
 if p_intent->>'kind' in('reference','revise') then
  if parent.id is null then raise exception 'Saved source required';end if;
  b=case when p_intent->>'source'='reference' then parent.reference else parent.background end;
  if b is null or b->>'mime'<>'image/png' or (b->>'pixelWidth')::integer<>1024 or (b->>'pixelHeight')::integer<>1024 then raise exception 'Unsupported AI edit format';end if;
 else if p_intent->>'source' is not null or p_intent->'region' is not null then raise exception 'Unexpected source/region';end if;end if;
 if p_intent->>'kind'='revise' then
  if p_intent->>'source' is distinct from 'artwork' then raise exception 'Area edit requires saved artwork';end if;
  region=p_intent->'region';
  if region is null or (select count(*) from jsonb_object_keys(region))<>4 or not (region ?& array['x','y','width','height']) or (region->>'x')::numeric<>(region->>'x')::integer or (region->>'y')::numeric<>(region->>'y')::integer or (region->>'width')::numeric<>(region->>'width')::integer or (region->>'height')::numeric<>(region->>'height')::integer or (region->>'x')::integer<0 or (region->>'y')::integer<0 or (region->>'width')::integer<1 or (region->>'height')::integer<1 or (region->>'x')::integer+(region->>'width')::integer>1024 or (region->>'y')::integer+(region->>'height')::integer>1024 then raise exception 'Invalid canonical region';end if;
 elsif p_intent->'region' is not null then raise exception 'Unexpected region';end if;
 insert into public.party_map_generation_jobs(id,party_id,user_id,intent,mode,state,deadline,reserved_cents,binding)
 values(rid,target,p_user,p_intent,p_mode,'queued',now()+make_interval(secs=>cfg.wait_seconds),case when p_mode='live' then cfg.reservation_cents else 0 end,jsonb_build_object('document',doc,'source',b,'parent',parent.id,'parentBackground',parent.background,'parentDocument',parent.document,'expectedVersion',(p_intent->>'expectedVersion')::integer,'region',region)) returning * into j;
 return to_jsonb(j);
end;$$;
-- CAS owns transitions; only the server calls it, never a browser asserted state.
create function public.transition_map_generation(p_id uuid,p_revision integer,p_state text,p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.party_map_generation_jobs;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server authority required' using errcode='42501';end if;
 select * into j from public.party_map_generation_jobs where id=p_id for update;
 if not found then raise exception 'Unknown job';end if;
 if j.revision<>p_revision then return to_jsonb(j);end if;
 if j.state in('completed','failed','cancelled') then return to_jsonb(j);end if;
 if j.state='queued' and p_state='running' and j.deadline<=now() then update public.party_map_generation_jobs set state='failed',code='expired-submission',revision=revision+1,updated_at=now() where id=j.id returning * into j;return to_jsonb(j);end if;
 if j.state in('running','uncertain') and j.deadline<=now() and p_state<>'cancelled' then update public.party_map_generation_jobs set state='failed',code='provider-timeout',revision=revision+1,updated_at=now() where id=j.id returning * into j;return to_jsonb(j);end if;
 if not ((j.state='queued' and p_state in('running','failed','cancelled')) or (j.state='running' and p_state in('uncertain','awaiting-client-output','failed','cancelled')) or (j.state='uncertain' and p_state in('awaiting-client-output','failed','cancelled')) or (j.state='awaiting-client-output' and p_state in('awaiting-client-output','failed','cancelled'))) then raise exception 'Invalid job transition';end if;
 update public.party_map_generation_jobs set state=p_state,revision=revision+1,updated_at=now(),provider_finished_at=case when j.state in('running','uncertain') and p_state='awaiting-client-output' then now() else provider_finished_at end,code=p_patch->>'code',submission_token=coalesce((p_patch->>'submissionToken')::uuid,submission_token),candidate=coalesce(p_patch->'candidate',candidate),proof=coalesce(p_patch->'proof',proof),provisional=coalesce(p_patch->'provisional',provisional) where id=p_id returning * into j;
 return to_jsonb(j);
end;$$;
create function public.complete_map_generation(p_id uuid,p_revision integer,p_proof jsonb,p_verified jsonb,p_background jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.party_map_generation_jobs;outcome jsonb;m public.party_grid_maps;parent public.party_map_artwork_versions;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server authority required' using errcode='42501';end if;
 -- Lock same family as04 attachment before accepting receipt/current revision.
 select * into j from public.party_map_generation_jobs where id=p_id for update;
 if not found then raise exception 'Unknown job';end if;
 perform pg_advisory_xact_lock(hashtextextended('grid-request/'||j.id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('grid-map/'||(j.intent->>'familyId'),0));
 if j.provider_finished_at is null or j.provider_finished_at>j.deadline or j.state not in('awaiting-client-output','completed') or j.revision<>p_revision or j.proof is distinct from p_proof or j.provisional is null or j.provisional->>'objectId' is distinct from j.id::text or j.provisional->>'digest' is distinct from p_verified->>'outputDigest' or j.provisional->>'size' is distinct from p_background->>'size' or p_background->>'object_id' is distinct from j.id::text or p_background->>'digest' is distinct from p_verified->>'outputDigest' or p_verified->>'actualRgbaDigest' is distinct from j.proof->>'expectedRgbaDigest' or j.proof->>'requestId' is distinct from j.id::text or j.proof->>'jobId' is distinct from j.id::text or j.proof->>'partyId' is distinct from j.party_id::text or j.proof->>'familyId' is distinct from j.intent->>'familyId' or j.proof->>'origin' is distinct from (case when j.intent->>'kind'='revise' then 'revised' else 'generated' end) or j.proof->>'candidateDigest' is distinct from j.candidate->>'digest' or j.proof->>'sourceDigest' is distinct from (case when j.intent->>'kind'='revise' then j.binding->'source'->>'digest' else j.candidate->>'digest' end) or j.proof->>'sourceObjectId' is distinct from (case when j.intent->>'kind'='revise' then j.binding->'source'->>'object_id' else j.candidate->>'objectId' end) or j.proof->>'candidateObjectId' is distinct from j.candidate->>'objectId' or j.proof->>'parentVersionId' is distinct from j.binding->>'parent' or (j.proof->>'expectedVersion')::integer is distinct from (j.intent->>'expectedVersion')::integer or j.proof->>'verifierVersion' is distinct from 'map-png-rgba-v1' or (j.proof->>'pixelWidth')::integer is distinct from 1024 or (j.proof->>'pixelHeight')::integer is distinct from 1024 or j.proof->'region' is distinct from coalesce(nullif(j.binding->'region','null'),'{"x":0,"y":0,"width":1024,"height":1024}'::jsonb) or j.proof->>'expectedRgbaDigest' is null or j.proof->>'expectedRgbaDigest' !~ '^[0-9a-f]{64}$' or j.proof->>'expiresAt' is null or (j.proof->>'expiresAt')::numeric<=extract(epoch from now())*1000 or p_verified->>'kind' is distinct from 'verified' then raise exception 'Job/proof/object binding rejected';end if;
 if not exists(select 1 from public.party_members where user_id=j.user_id and party_id=j.party_id and role='dungeon-master') then raise exception 'Dungeon Master access required' using errcode='42501';end if;
 if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=j.party_id::text||'/'||j.id::text and (metadata->>'size')::bigint=(p_background->>'size')::bigint and metadata->>'mimetype'='image/png') then raise exception 'Immutable output unavailable';end if;
 select * into parent from public.party_map_artwork_versions where id=j.binding->>'parent' and party_id=j.party_id;
 if j.binding->>'parent' is not null and (parent.id is null or parent.document is distinct from j.binding->'parentDocument' or parent.background is distinct from j.binding->'parentBackground') then raise exception 'Saved parent changed';end if;
 -- Completed recovery checks object/proof above, then same original accepting tuple.
 if j.state='completed' then
  if not exists(select 1 from public.party_map_artwork_versions where id=j.id::text and job_id=j.id and request_id=j.id and family_id=(j.intent->>'familyId')::uuid and parent_version_id is not distinct from j.binding->>'parent' and background->>'digest'=p_verified->>'outputDigest') then raise exception 'Receipt binding rejected';end if;
  return to_jsonb(j);
 end if;
 select * into m from public.party_grid_maps where id=(j.intent->>'familyId')::uuid;
 if (m.id is null and (j.intent->>'expectedVersion')::integer<>0) or (m.id is not null and (m.party_id<>j.party_id or m.version<>(j.intent->>'expectedVersion')::integer)) then
  update public.party_map_generation_jobs set state='failed',code='stale-parent',revision=revision+1,updated_at=now() where id=j.id returning * into j;return to_jsonb(j);
 end if;
 outcome=public.attach_server_map_artwork_version(j.party_id,(j.intent->>'familyId')::uuid,j.binding->>'parent',(j.intent->>'expectedVersion')::integer,j.id,j.id,case when j.intent->>'kind'='revise' then 'revised' else 'generated' end,j.intent->>'title',j.binding->'document',p_background,null,j.intent->>'instructions',j.intent->>'kind'='revise');
 if outcome->>'ok'<>'true' then raise exception 'Attachment conflict';end if;
 update public.party_map_generation_jobs set state='completed',result=outcome,revision=revision+1,updated_at=now(),code=null where id=j.id returning * into j;
 return to_jsonb(j);
end;$$;
revoke all on function public.map_generation_snapshot(public.party_map_generation_jobs),public.read_map_generation_jobs(),public.reserve_map_generation(uuid,jsonb,text),public.transition_map_generation(uuid,integer,text,jsonb),public.complete_map_generation(uuid,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.read_map_generation_jobs() to authenticated;
grant execute on function public.map_generation_snapshot(public.party_map_generation_jobs),public.reserve_map_generation(uuid,jsonb,text),public.transition_map_generation(uuid,integer,text,jsonb),public.complete_map_generation(uuid,integer,jsonb,jsonb,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('private-map-generation','private-map-generation',false,20971520,array['image/png']);
-- Generation-owned objects are write-once even for privileged storage calls.
create function public.guard_generation_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='private-map-generation' and TG_OP='UPDATE' then raise exception 'Generation objects are immutable';end if;
 if exists(select 1 from public.party_map_generation_jobs j where (old.bucket_id='private-map-generation' and old.name=j.party_id::text||'/'||j.id::text and not j.orphan_released) or (old.bucket_id='party-handouts' and ((old.name=j.party_id::text||'/'||j.id::text and not j.orphan_released) or old.name=j.party_id::text||'/'||(j.binding->'source'->>'object_id')))) then raise exception 'Generation object is retained';end if;
 if TG_OP='UPDATE' then return new;end if;
 return old;
end;$$;
create trigger guard_generation_object before update or delete on storage.objects for each row execute function public.guard_generation_object();
revoke all on function public.guard_generation_object() from public;

-- Terminal unaccepted orphan refs only. Returned objects may be removed by the
-- owned cleanup adapter; accepted versions and completed recovery remain retained.
create function public.release_map_generation_orphans() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.party_map_generation_jobs;objects jsonb='[]';begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server authority required' using errcode='42501';end if;
 for j in select * from public.party_map_generation_jobs where state in('failed','cancelled') and updated_at<now()-interval '24 hours' and deadline<now() and not cleanup_complete for update loop
  objects=objects||jsonb_build_array(jsonb_build_object('jobId',j.id,'bucket','private-map-generation','partyId',j.party_id,'objectId',j.id));
  if not exists(select 1 from public.party_map_artwork_versions where party_id=j.party_id and background->>'object_id'=j.id::text) then objects=objects||jsonb_build_array(jsonb_build_object('jobId',j.id,'bucket','party-handouts','partyId',j.party_id,'objectId',j.id));end if;
  update public.party_map_generation_jobs set proof=null,orphan_released=true where id=j.id;
 end loop;
 return objects;
end;$$;
revoke all on function public.release_map_generation_orphans() from public,anon,authenticated;
grant execute on function public.release_map_generation_orphans() to service_role;

create function public.ack_map_generation_orphans(p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server authority required' using errcode='42501';end if;
 update public.party_map_generation_jobs set candidate=null,provisional=null,cleanup_complete=true where id=any(p_ids) and orphan_released and state in('failed','cancelled') and updated_at<now()-interval '24 hours';
end;$$;
revoke all on function public.ack_map_generation_orphans(uuid[]) from public,anon,authenticated;
grant execute on function public.ack_map_generation_orphans(uuid[]) to service_role;
