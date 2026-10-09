import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initialize,compose} from './image.mjs';import {verify} from './verify.mjs';
await initialize(await readFile(new URL('./deps/package/dist/x86/magick.wasm',import.meta.url)));
const region={x:650,y:160,width:220,height:240};
for(const name of ['live','transparent','lowalpha','noise'])test(name+' exact canonical RGBA replacement',async()=>{
 const source=await readFile(new URL('./fixtures/'+name+'-source.png',import.meta.url)),candidate=await readFile(new URL('./fixtures/'+name+'-candidate.png',import.meta.url));
 const result=verify(source,candidate,compose(source,candidate,region));assert.equal(result.exact,true,JSON.stringify(result));
});
const source=await readFile(new URL('./fixtures/live-source.png',import.meta.url));
for(const [name,candidate,bounds] of [['corrupt',new Uint8Array(40),region],['truncated',source.subarray(0,40),region],['bounds',source,{...region,x:1000}],['null bounds',source,null],['dimension',(()=>{const b=Buffer.from(source);b.writeUInt32BE(1000,16);return b;})(),region]])test(name+' rejected',()=>assert.throws(()=>compose(source,candidate,bounds)));
