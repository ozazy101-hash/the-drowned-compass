// Private admitted PNG decoder, derived from accepted03 source8e679aede15bfaa106ab8e5f13dbd672c02f1583.
// Probe routes, manifest, fixture controls and logs are excluded.
const table=Uint32Array.from({length:256},(_,i)=>{for(let b=0;b<8;b++)i=(i>>>1)^((i&1)?0xedb88320:0);return i>>>0;});
export function crc(bytes){let n=0xffffffff;for(let i=0;i<bytes.length;i++)n=(n>>>8)^table[(n^bytes[i])&255];return(n^0xffffffff)>>>0;}
const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
export async function decode(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<33||bytes.length>20*1024*1024||bytes.subarray(0,8).join(',')!=='137,80,78,71,13,10,26,10')throw Error('Invalid PNG bytes');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width,height,channels,ended=false,data=false,dataEnded=false;const idat=[];
 for(let offset=8;offset<bytes.length;){
  if(offset+12>bytes.length)throw Error('Truncated chunk');const size=view.getUint32(offset),end=offset+size+12;
  if(end>bytes.length)throw Error('Truncated chunk');const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8)),body=bytes.subarray(offset+8,end-4);
  if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase())throw Error('Invalid chunk type');
  if(crc(bytes.subarray(offset+4,end-4))!==view.getUint32(end-4))throw Error('CRC mismatch');
  if(width===undefined&&type!=='IHDR')throw Error('Header order');
  if(type==='IHDR'){
   if(width!==undefined||size!==13)throw Error('Duplicate/invalid header');width=view.getUint32(offset+8);height=view.getUint32(offset+12);
   if(width!==1024||height!==1024)throw Error('Only 1024 square admitted');
   if(body[8]!==8||![2,6].includes(body[9])||body[10]||body[11]||body[12])throw Error('Unsupported encoding');channels=body[9]===6?4:3;
  }else if(type==='IDAT'){if(dataEnded)throw Error('Nonconsecutive IDAT');data=true;idat.push(body);}
  else if(type==='IEND'){if(size||!data||end!==bytes.length)throw Error('Invalid end/trailing');ended=true;}
  else{if(data)dataEnded=true;if(['PLTE','tRNS','acTL','fcTL','fdAT'].includes(type)||type[0]===type[0].toUpperCase())throw Error('Unsupported critical/palette/frame');}
  offset=end;
 }if(!ended)throw Error('Missing end');
 const expected=(width*channels+1)*height,raw=new Uint8Array(expected);let part=0,position=0;
 const compressed=new ReadableStream({pull(controller){while(part<idat.length&&position===idat[part].length){part++;position=0;}if(part===idat.length){controller.close();return;}const end=Math.min(position+65536,idat[part].length);controller.enqueue(idat[part].subarray(position,end));position=end;}});
 const reader=compressed.pipeThrough(new DecompressionStream('deflate')).getReader();let count=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;if(value.length>expected-count){await reader.cancel();throw Error('Inflation exceeds exact bound');}raw.set(value,count);count+=value.length;}}finally{reader.releaseLock();}
 if(count!==expected)throw Error('Scanline length');
 const stride=width*channels,scan=new Uint8Array(stride*height);
 for(let y=0;y<height;y++){
  const start=y*(stride+1),filter=raw[start];if(filter>4)throw Error('Invalid filter');
  if(filter===0){scan.set(raw.subarray(start+1,start+stride+1),y*stride);continue;}
  for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?scan[i-channels]:0,b=y?scan[i-stride]:0,c=y&&x>=channels?scan[i-stride-channels]:0;
   scan[i]=(raw[start+1+x]+(filter===1?a:filter===2?b:filter===3?(a+b)>>1:paeth(a,b,c)))&255;}
 }if(channels===4)return scan;
 const rgba=new Uint8Array(width*height*4);for(let i=0;i<width*height;i++){rgba[i*4]=scan[i*3];rgba[i*4+1]=scan[i*3+1];rgba[i*4+2]=scan[i*3+2];rgba[i*4+3]=255;}return rgba;
}
export async function boundedBody(stream,limit=20*1024*1024){if(!stream)throw Error('Missing PNG body');const reader=stream.getReader(),parts=[];let length=0;try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('Encoded byte bound');}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;}
export async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function regionValid(region){if(!region||!['x','y','width','height'].every(k=>Number.isInteger(region[k]))||region.x<0||region.y<0||region.width<1||region.height<1||region.x+region.width>1024||region.y+region.height>1024)throw Error('Invalid trusted region');}
async function sourceIdentity(binding,id,source,candidate){
 if(!binding||binding.requestId!==id||!binding.parentId||!binding.files)throw Error('Trusted binding mismatch');regionValid(binding.region);
 if(source.length!==binding.files.source.bytes||candidate.length!==binding.files.candidate.bytes||await digest(source)!==binding.files.source.sha256||await digest(candidate)!==binding.files.candidate.sha256)throw Error('Trusted source/candidate identity mismatch');
}
export async function prepareExpected(binding,id,source,candidate,now=Date.now()){
 await sourceIdentity(binding,id,source,candidate);const expected=await decode(source),replacement=await decode(candidate),r=binding.region;
 for(let y=r.y;y<r.y+r.height;y++){const offset=(y*1024+r.x)*4;expected.set(replacement.subarray(offset,offset+r.width*4),offset);}
 return {requestId:id,parentId:binding.parentId,region:{...r},sourceDigest:binding.files.source.sha256,candidateDigest:binding.files.candidate.sha256,pixelWidth:1024,pixelHeight:1024,expectedRgbaDigest:await digest(expected),expiresAt:now+300000};
}
export async function finalizeExpected(binding,id,proof,output,now=Date.now()){
 if(!binding||binding.requestId!==id||!proof||proof.requestId!==id||proof.parentId!==binding.parentId||proof.sourceDigest!==binding.files.source.sha256||proof.candidateDigest!==binding.files.candidate.sha256||proof.pixelWidth!==1024||proof.pixelHeight!==1024||!Number.isFinite(proof.expiresAt)||proof.expiresAt<=now||!(/^[0-9a-f]{64}$/).test(proof.expectedRgbaDigest)||!['x','y','width','height'].every(k=>proof.region?.[k]===binding.region[k]))throw Error('Prepared binding mismatch or expired');
 regionValid(binding.region);const rgba=await decode(output),actualRgbaDigest=await digest(rgba);
 return {kind:actualRgbaDigest===proof.expectedRgbaDigest?'verified':'rejected',requestId:id,parentId:proof.parentId,region:proof.region,sourceDigest:proof.sourceDigest,candidateDigest:proof.candidateDigest,outputDigest:await digest(output),actualRgbaDigest,pixelWidth:1024,pixelHeight:1024,outside:1024*1024-proof.region.width*proof.region.height,inside:proof.region.width*proof.region.height};
}
