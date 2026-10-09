import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePng,decodePng} from './png.mjs';
import {runIntent,fixtureProvider,openAIProvider,MODEL} from './probe.mjs';
const pixels=(w=4,h=3,seed=0)=>{const rgba=Buffer.alloc(w*h*4);for(let i=0;i<rgba.length;i++)rgba[i]=(i*19+seed)%256;return {width:w,height:h,rgba};};
const source=encodePng(pixels()),replacement=encodePng(pixels(4,3,37));
const intent=(region={x:1,y:1,width:2,height:1})=>({kind:'revise',prompt:'Add chamber',requestId:'job-1',source:{identity:'saved-parent',bytes:source},region});
const response=(status,payload,headers={})=>new Response(JSON.stringify(payload),{status,headers});
test('arbitrary generation normalizes bytes, digest, dimensions and new registration',async()=>{
 const result=await runIntent({kind:'generate',prompt:'shrine',requestId:'job-1'},fixtureProvider(replacement));
 assert.equal(result.kind,'accepted');assert.equal(result.registration,'new');assert.equal(result.width,4);assert.equal(result.height,3);assert.equal(result.mime,'image/png');assert.equal(result.digest.length,64);assert.equal(result.receipt.mode,'fixture');assert.equal(result.composition,null);
});
test('reference does not inherit registration',async()=>{const input=intent();input.kind='reference';delete input.region;assert.equal((await runIntent(input,fixtureProvider(replacement))).registration,'new');});
for(const region of [{x:1,y:1,width:2,height:1},{x:0,y:0,width:1,height:1},{x:3,y:2,width:1,height:1},{x:0,y:0,width:4,height:3}])test(`lossless composition ${JSON.stringify(region)}`,async()=>{
 const result=await runIntent(intent(region),fixtureProvider(replacement));assert.equal(result.kind,'accepted');
 const got=decodePng(result.bytes).rgba,a=decodePng(source).rgba,b=decodePng(replacement).rgba;
 for(let y=0;y<3;y++)for(let x=0;x<4;x++){const i=(y*4+x)*4,inside=x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height;assert.deepEqual(got.subarray(i,i+4),(inside?b:a).subarray(i,i+4));}
 assert.equal(result.parentIdentity,'saved-parent');assert.equal(result.registration,'server-verification-required');assert.equal(result.composition.preserved,true);
});
test('provider alpha polarity selected transparent; outside opaque',async()=>{
 const result=await runIntent(intent(),{generate:async input=>{const mask=decodePng(input.mask);for(let y=0;y<3;y++)for(let x=0;x<4;x++)assert.equal(mask.rgba[(y*4+x)*4+3],y===1&&(x===1||x===2)?0:255);return {kind:'image',bytes:replacement};}});assert.equal(result.kind,'accepted');
});
for(const region of [{x:-1,y:0,width:1,height:1},{x:0,y:0,width:0,height:1},{x:3,y:2,width:2,height:1},{x:0.5,y:0,width:1,height:1},null])test(`invalid region rejects before provider ${JSON.stringify(region)}`,async()=>{assert.equal((await runIntent(intent(region),{generate:()=>assert.fail('must not submit')})).code,'invalid-input');});
test('dimension drift rejected, no inherited registration',async()=>assert.equal((await runIntent(intent(),fixtureProvider(encodePng(pixels(3,3))))).code,'invalid-output'));
for(const bytes of [Buffer.from('JPEG'),Buffer.alloc(0),source.subarray(0,source.length-5),Buffer.from(source).fill(0,20,24)])test(`invalid output ${bytes.length}/${bytes[20]}`,async()=>assert.equal((await runIntent(intent(),fixtureProvider(bytes))).code,'invalid-output'));
test('invalid source rejected before provider',async()=>{const input=intent();input.source.bytes=Buffer.from('bad');assert.equal((await runIntent(input,{generate:()=>assert.fail('must not submit')})).code,'invalid-input');});
test('missing source identity rejected',async()=>{const input=intent();delete input.source.identity;assert.equal((await runIntent(input,fixtureProvider(replacement))).code,'invalid-input');});
test('missing credential never submits',async()=>assert.equal((await openAIProvider({fetchImpl:()=>assert.fail('must not submit')}).generate({size:'1024x1024'})).code,'missing-OPENAI_API_KEY'));
for(const [status,kind]of [[401,'failed'],[429,'failed'],[500,'uncertain'],[408,'uncertain']])test(`HTTP ${status} normalized without retry`,async()=>{let calls=0;const result=await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>{calls++;return response(status,{});}}).generate({requestId:'r',prompt:'p',size:'1024x1024'});assert.equal(result.kind,kind);assert.equal(calls,1);});
test('ambiguous disconnected submission never retries',async()=>{let calls=0;assert.equal((await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>{calls++;throw Error('disconnect');}}).generate({size:'1024x1024'})).kind,'uncertain');assert.equal(calls,1);});
test('invalid provider base64 rejected',async()=>assert.equal((await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>response(200,{data:[{b64_json:'not base64!'}]})}).generate({size:'1024x1024'})).code,'invalid-provider-output'));
test('live adapter sends exact pinned model and normalized receipt/usage',async()=>{
 const provider=openAIProvider({apiKey:'test-placeholder',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(options.body.get('model'),MODEL);assert.ok(options.body.get('mask') instanceof Blob);assert.equal(options.headers['X-Client-Request-Id'],'job-1');return response(200,{data:[{b64_json:replacement.toString('base64')}],usage:{total_tokens:123}},{'x-request-id':'receipt-1'});}});
 const result=await provider.generate({requestId:'job-1',prompt:'Add chamber',size:'1024x1024',source,mask:source});assert.equal(result.kind,'image');assert.equal(result.receipt.providerRequestId,'receipt-1');assert.equal(result.usage.total_tokens,123);
});
test('16 million pixel existing maximum local PNG roundtrip',()=>{const image=pixels(4000,4000);const decoded=decodePng(encodePng(image));assert.deepEqual(decoded.rgba,image.rgba);});
test('above existing dimension limit rejected',()=>assert.throws(()=>encodePng({width:4001,height:4000,rgba:Buffer.alloc(0)}),/dimensions/));

test('multi-MiB canonical provider image succeeds without validator stack overflow',async()=>{
 const rgba=Buffer.alloc(1024*1024*4);let state=0x12345678;
 for(let i=0;i<rgba.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;rgba[i]=state&255;}
 const png=encodePng({width:1024,height:1024,rgba});assert.ok(png.length>4*1024*1024);
 const result=await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>response(200,{data:[{b64_json:png.toString('base64')}]})}).generate({requestId:'large',prompt:'shrine',size:'1024x1024'});
 assert.equal(result.kind,'image');assert.deepEqual(result.bytes,png);
});
for(const b64 of ['A===','AA=A','AB=='])test(`invalid padding or noncanonical bits ${b64}`,async()=>{
 const result=await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>response(200,{data:[{b64_json:b64}]})}).generate({size:'1024x1024'});
 assert.equal(result.code,'invalid-provider-output');
});

for(const size of ['4000x4000','1025x1024','1024x512','3840x3840','3072x640','auto'])test(`unsupported live requested dimensions ${size} reject before fetch`,async()=>{
 const result=await openAIProvider({apiKey:'test-placeholder',fetchImpl:()=>assert.fail('must not submit')}).generate({size});assert.equal(result.code,'unsupported-provider-dimensions');
});
for(const size of ['1024x640','3840x2160','3072x1024'])test(`supported live dimension boundary ${size}`,async()=>{
 const result=await openAIProvider({apiKey:'test-placeholder',fetchImpl:async()=>response(200,{data:[{b64_json:replacement.toString('base64')}]})}).generate({size});assert.equal(result.kind,'image');
});

test('near20MiB raw image falls back to compressed PNG instead of overhead rejection',()=>{
 const image={width:1456,height:3600,rgba:Buffer.alloc(1456*3600*4)};
 const bytes=encodePng(image);assert.ok(bytes.length<20*1024*1024);
 const decoded=decodePng(bytes);assert.equal(decoded.width,1456);assert.equal(decoded.height,3600);assert.deepEqual(decoded.rgba,image.rgba);
});
