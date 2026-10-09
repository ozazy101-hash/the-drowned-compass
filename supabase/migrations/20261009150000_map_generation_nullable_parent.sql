-- Preserve SQL NULL for retained reference-only parents: jsonb_build_object
-- stores absent artwork as JSON null. All other attachment guards stay intact.
create or replace function public.complete_map_generation(p_id uuid,p_revision integer,p_proof jsonb,p_verified jsonb,p_background jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if j.binding->>'parent' is not null and (parent.id is null or parent.document is distinct from j.binding->'parentDocument' or parent.background is distinct from nullif(j.binding->'parentBackground','null'::jsonb)) then raise exception 'Saved parent changed';end if;
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
