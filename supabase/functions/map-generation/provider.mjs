// Internal provider port; never imported by browser modules. Model fixed to accepted03.
const model='gpt-image-2.5-sunburst';
export function liveProvider({key,fetchImpl=fetch,encodeMask}){
 return {async reconcile(){return {kind:'uncertain'};},async generate(input){
  if(!key)return {kind:'failed',code:'missing-credentials'};
  const headers={Authorization:`Bearer ${key}`,'X-Client-Request-Id':input.requestId};
  const fields={model,prompt:`Orthographic overhead map, no baked grid, labels, tokens or people. ${input.prompt}`,n:1,size:'1024x1024',quality:'low',output_format:'png'};
  let body,endpoint='generations';
  if(input.source){endpoint='edits';body=new FormData();for(const [k,v]of Object.entries(fields))body.set(k,String(v));body.append('image[]',new Blob([input.source],{type:'image/png'}),'source.png');if(input.region)body.set('mask',new Blob([await encodeMask(input.region)],{type:'image/png'}),'mask.png');}
  else{headers['Content-Type']='application/json';body=JSON.stringify(fields);}
  try{
   const response=await fetchImpl(`https://api.openai.com/v1/images/${endpoint}`,{method:'POST',headers,body,signal:input.signal});
   if(!response.ok)return {kind:response.status>=500||response.status===408?'uncertain':'failed',code:response.status===429?'rate-limit':'provider-failed'};
   const reader=response.body.getReader(),parts=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>Math.ceil(20*1024*1024*4/3)+65536){await reader.cancel();return {kind:'uncertain'};}parts.push(value);}
   const raw=new Uint8Array(size);let at=0;for(const p of parts){raw.set(p,at);at+=p.length;}
   const payload=JSON.parse(new TextDecoder().decode(raw)),b64=payload.data?.[0]?.b64_json;
   if(payload.data?.length!==1||typeof b64!=='string'||!b64.length||b64.length%4)return {kind:'failed',code:'invalid-provider-output'};
   const binary=atob(b64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(btoa(binary)!==b64||bytes.length>20*1024*1024)return {kind:'failed',code:'invalid-provider-output'};
   return {kind:'image',bytes};
  }catch{return {kind:'uncertain'};}
 }};
}
export function fixtureProvider(bytes){return {async generate(){return {kind:'image',bytes};},async reconcile(){return {kind:'uncertain'};}};}
