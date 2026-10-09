import { spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { localSettings, sql, snapshot, acquireVerificationLock } from './local-verification.mjs';
// Only local, leased, unique Ticket09 identities. Credentials stay in child env.
const config = localSettings(), release = acquireVerificationLock(), baseline = snapshot();
const dm = randomUUID(), player = randomUUID(), party = sql('select id from public.parties order by id limit 1;');
const prefix = 'Ticket09 fixture ' + randomUUID();
if (sql(`select count(*) from public.party_map_presentations where party_id='${party}';`) !== '0') { release(); throw new Error('Fixture party already has a presentation; choose an isolated party instead of replacing accepted state.'); }
function token(user) { const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url'); const unsigned = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: user, role: 'authenticated', aud: 'authenticated', iss: config.API_URL + '/auth/v1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }); return unsigned + '.' + createHmac('sha256', config.JWT_SECRET).update(unsigned).digest('base64url'); }
let status = 1;
try {
  sql(`begin;insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values('${dm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${dm}@verification.test',now(),'','','','',now(),now(),'{}','{}'),('${player}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${player}@verification.test',now(),'','','','',now(),now(),'{}','{}');insert into public.party_members(party_id,user_id,role) values('${party}','${dm}','dungeon-master'),('${party}','${player}','player');commit;`);
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.map-reveal.config.ts', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, MAP_LIVE_URL: config.API_URL, MAP_LIVE_KEY: config.ANON_KEY, MAP_LIVE_DM_JWT: token(dm), MAP_LIVE_PLAYER_JWT: token(player), MAP_FIXTURE_PREFIX: prefix } }); status = result.status ?? 1;
} finally {
  try {
    const maps = JSON.parse(sql(`select coalesce(jsonb_agg(id),'[]') from public.party_grid_maps where party_id='${party}' and title like '${prefix}%';`));
    if (maps.length) {
      const ids = maps.map(id => `'${id}'`).join(',');
      sql(`begin;delete from public.party_map_reveal_masks where party_id='${party}' and family_id in(${ids});delete from public.party_map_presentation_requests where party_id='${party}' and presentation->'version'->>'family_id' in(${ids});delete from public.party_map_presentations where party_id='${party}' and version_id in(select id from public.party_map_artwork_versions where family_id in(${ids}));delete from public.party_map_artwork_versions where party_id='${party}' and family_id in(${ids});delete from public.party_grid_map_requests where party_id='${party}' and map_id in(${ids});delete from public.party_grid_maps where party_id='${party}' and id in(${ids});commit;`);
    }
    sql(`begin;delete from public.party_members where user_id in('${dm}','${player}');delete from auth.users where id in('${dm}','${player}');commit;`);
    const final = snapshot();
    if (JSON.stringify(final) !== JSON.stringify(baseline)) throw new Error('Ticket09 fixture cleanup did not restore exact schema/data baseline.');
    const original = JSON.parse(readFileSync('.scratch/map-creation/evidence/09-baseline-before.json', 'utf8'));
    if (Object.entries(original.tables).some(([table, hash]) => final.tables[table] !== hash)) throw new Error('An original table changed during Ticket09 verification.');
    writeFileSync('.scratch/map-creation/evidence/09-baseline-final.json', JSON.stringify(final, null, 2) + '\n');
    console.log(`Ticket09 exact cleanup: ${maps.length} owned maps, 2 owned auth users; original tables unchanged, new mask table empty.`);
  } finally { release(); }
}
process.exitCode = status;
