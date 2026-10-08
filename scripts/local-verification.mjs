import {mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const container='supabase_db_the-drowned-compass';
export function sql(source){const r=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:source,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim();}
export function localSettings(){const r=spawnSync('pnpm',['exec','supabase','status','-o','json'],{encoding:'utf8'});if(r.status!==0)throw new Error('Local Supabase unavailable');const c=JSON.parse(r.stdout);if(c.API_URL!=='http://127.0.0.1:54321'||sql('select current_database();')!=='postgres')throw new Error('Only known local Supabase endpoint/container allowed');return c;}
export function snapshot(){
 const dump=spawnSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=storage','--schema=auth'],{encoding:'utf8',maxBuffer:20*1024*1024});if(dump.status!==0)throw new Error(dump.stderr);
 const schema=dump.stdout.split('\n').filter(line=>!line.startsWith('\\restrict ')&&!line.startsWith('\\unrestrict ')).join('\n');
 const tables=JSON.parse(sql("select json_agg(format('%I.%I',schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname='public' or (schemaname='storage' and tablename in('objects','buckets')) or (schemaname='auth' and tablename in('users','identities'));"));
 const data=tables.map(table=>[table,sql(`select coalesce(jsonb_agg(v order by v::text),'[]') from (select to_jsonb(t) v from ${table} t) q;`)]);
 const hash=value=>createHash('sha256').update(value).digest('hex');return {schema:hash(schema),data:hash(JSON.stringify(data)),tables:Object.fromEntries(data.map(([table,rows])=>[table,hash(rows)]))};
}

export function acquireVerificationLock(){const path='/private/tmp/ticket09-local-verification.lock';try{mkdirSync(path);}catch{throw new Error('Another Ticket09 database fixture/rehearsal is active');}let held=true;const release=()=>{if(held){held=false;rmSync(path,{recursive:true});}};process.once('exit',release);return release;}
