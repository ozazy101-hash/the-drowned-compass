begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
-- The focused runner rehearses the additive migration here, inside rollback.
-- __NULLABLE_PARENT_MIGRATION__
insert into public.parties(id,name)values('66100000-0000-4000-8000-000000000001','Ticket06 nullable parent rollback');
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)values('66100000-0000-4000-8000-000000000011','ticket06-null-parent@verification.test','{}','{}');
insert into public.party_members(party_id,user_id,role)values('66100000-0000-4000-8000-000000000001','66100000-0000-4000-8000-000000000011','dungeon-master');
insert into storage.objects(bucket_id,name,metadata)values('party-handouts','66100000-0000-4000-8000-000000000001/66100000-0000-4000-8000-000000000005','{"size":68,"mimetype":"image/png"}'),('party-handouts','66100000-0000-4000-8000-000000000001/66100000-0000-4000-8000-000000000004','{"size":68,"mimetype":"image/png"}');
create function pg_temp.background(id text)returns jsonb language sql as $$select jsonb_build_object('object_id',id,'size',68,'digest',repeat('c',64),'mime','image/png','x',1,'y',0,'width',6,'height',6,'pixelWidth',1024,'pixelHeight',1024);$$;
set local role authenticated;
set local "request.jwt.claim.role"='authenticated';
set local "request.jwt.claim.sub"='66100000-0000-4000-8000-000000000011';
select lives_ok($$select public.attach_map_artwork_version('66100000-0000-4000-8000-000000000003',null,0,'66100000-0000-4000-8000-000000000002','Retained reference only','{"columns":8,"rows":6,"feetPerSquare":5,"terrain":[],"edges":[]}',null,pg_temp.background('66100000-0000-4000-8000-000000000005'),'Private reference','nullable-parent')$$,'DM retains a genuine reference-only parent through04');
reset role;
select ok((select background is null and reference is not null from public.party_map_artwork_versions where id='66100000-0000-4000-8000-000000000002'),'retained parent has SQL NULL artwork and usable reference');
insert into public.party_map_generation_settings(party_id,fixture_enabled,quota)values('66100000-0000-4000-8000-000000000001',true,5);
set local "request.jwt.claim.role"='service_role';
select public.reserve_map_generation('66100000-0000-4000-8000-000000000011','{"requestId":"66100000-0000-4000-8000-000000000004","familyId":"66100000-0000-4000-8000-000000000003","parentVersionId":"66100000-0000-4000-8000-000000000002","expectedVersion":1,"kind":"reference","source":"reference","title":"Generated from reference","instructions":"Sea cave"}','fixture');
select is((select binding->'parentBackground' from public.party_map_generation_jobs where id='66100000-0000-4000-8000-000000000004'),'null'::jsonb,'server binding encodes absent parent artwork as JSON null');
select public.transition_map_generation('66100000-0000-4000-8000-000000000004',1,'running','{"submissionToken":"66100000-0000-4000-8000-000000000020"}');
create function pg_temp.proof()returns jsonb language sql as $$select jsonb_build_object('requestId','66100000-0000-4000-8000-000000000004','jobId','66100000-0000-4000-8000-000000000004','partyId','66100000-0000-4000-8000-000000000001','familyId','66100000-0000-4000-8000-000000000003','parentVersionId','66100000-0000-4000-8000-000000000002','origin','generated','sourceObjectId','66100000-0000-4000-8000-000000000004','candidateObjectId','66100000-0000-4000-8000-000000000004','sourceDigest',repeat('b',64),'candidateDigest',repeat('b',64),'expectedVersion',1,'verifierVersion','map-png-rgba-v1','expectedRgbaDigest',repeat('a',64),'expiresAt',extract(epoch from now())*1000+86400000,'pixelWidth',1024,'pixelHeight',1024,'region','{"x":0,"y":0,"width":1024,"height":1024}'::jsonb);$$;
create function pg_temp.verified()returns jsonb language sql as $$select jsonb_build_object('kind','verified','outputDigest',repeat('c',64),'actualRgbaDigest',repeat('a',64));$$;
select public.transition_map_generation('66100000-0000-4000-8000-000000000004',2,'awaiting-client-output',jsonb_build_object('candidate',jsonb_build_object('objectId','66100000-0000-4000-8000-000000000004','size',68,'digest',repeat('b',64)),'proof',pg_temp.proof(),'provisional',jsonb_build_object('objectId','66100000-0000-4000-8000-000000000004','size',68,'digest',repeat('c',64))));
-- Change an actual retained binding after reservation, in this fixture's accepting
-- transaction only. The production immutability trigger forbids later mutation.
update public.party_map_artwork_versions set background=pg_temp.background('66100000-0000-4000-8000-000000000005') where id='66100000-0000-4000-8000-000000000002';
select throws_ok($$select public.complete_map_generation('66100000-0000-4000-8000-000000000004',3,pg_temp.proof(),pg_temp.verified(),pg_temp.background('66100000-0000-4000-8000-000000000004'))$$,'P0001','Saved parent changed','a real changed parent background remains rejected');
select is((select count(*)from public.party_map_artwork_versions where family_id='66100000-0000-4000-8000-000000000003'),1::bigint,'rejected changed parent preserves retained version');
update public.party_map_artwork_versions set background=null where id='66100000-0000-4000-8000-000000000002';
select is(public.complete_map_generation('66100000-0000-4000-8000-000000000004',3,pg_temp.proof(),pg_temp.verified(),pg_temp.background('66100000-0000-4000-8000-000000000004'))->>'state','completed','verified reference output completes with unchanged NULL parent artwork');
select is((select count(*)from public.party_map_artwork_versions where family_id='66100000-0000-4000-8000-000000000003'),2::bigint,'completion appends exactly one private version');
select ok((select background is null and reference->>'object_id'='66100000-0000-4000-8000-000000000005' from public.party_map_artwork_versions where id='66100000-0000-4000-8000-000000000002'),'completion preserves reference-only parent');
select is(public.complete_map_generation('66100000-0000-4000-8000-000000000004',4,pg_temp.proof(),pg_temp.verified(),pg_temp.background('66100000-0000-4000-8000-000000000004'))->>'state','completed','completed receipt recovery accepts the same NULL parent binding');
select is((select count(*)from public.party_map_presentations where party_id='66100000-0000-4000-8000-000000000001'),0::bigint,'reference completion/recovery never implicitly selects display');
select * from finish();
rollback;
