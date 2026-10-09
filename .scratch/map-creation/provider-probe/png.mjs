import { Buffer } from 'node:buffer';
// Throwaway Node capability probe, not a production decoder or Edge-runtime proof.
import { deflateSync, inflateSync } from 'node:zlib';
export const limits = Object.freeze({ bytes: 20 * 1024 * 1024, pixels: 16_000_000 });
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
function dimensions(width,height) {
  if (![width,height].every(v=>Number.isInteger(v)&&v>0) || width*height>limits.pixels) throw Error('Invalid dimensions');
}
const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});
function crc(bytes) {
  let value=0xffffffff;
  for(const byte of bytes)value=(value>>>8)^crcTable[(value^byte)&255];
  return (value^0xffffffff)>>>0;
}
function chunk(type,data) {
  const name=Buffer.from(type), result=Buffer.alloc(data.length+12);
  result.writeUInt32BE(data.length); name.copy(result,4); data.copy(result,8);
  result.writeUInt32BE(crc(Buffer.concat([name,data])),data.length+8); return result;
}
export function encodePng({width,height,rgba}) {
  dimensions(width,height);
  if(rgba.length!==width*height*4) throw Error('Invalid pixels');
  const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8; header[9]=6;
  const raw=Buffer.alloc(height*(width*4+1));
  for(let y=0;y<height;y++) Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(raw,y*(width*4+1)+1);
  const bytes=Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:raw.length+100<=limits.bytes?0:1})),chunk('IEND',Buffer.alloc(0))]);
  if(bytes.length>limits.bytes) throw Error('Image too large'); return bytes;
}
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
export function decodePng(input) {
  const bytes=Buffer.from(input);
  if(!bytes.length||bytes.length>limits.bytes||!bytes.subarray(0,8).equals(signature)) throw Error('Invalid PNG');
  let offset=8, width,height,channels,ended=false,seenData=false,dataEnded=false; const compressed=[];
  while(offset<bytes.length) {
    if(offset+12>bytes.length) throw Error('Truncated PNG');
    const size=bytes.readUInt32BE(offset), end=offset+size+12;
    if(end>bytes.length) throw Error('Truncated PNG');
    const type=bytes.toString('ascii',offset+4,offset+8), body=bytes.subarray(offset+8,end-4);
    if(crc(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4)) throw Error('PNG CRC mismatch');
    if(width===undefined && type!=='IHDR') throw Error('Missing PNG header');
    if(type==='IHDR') {
      if(width!==undefined||size!==13) throw Error('Invalid PNG header');
      width=body.readUInt32BE(0); height=body.readUInt32BE(4); dimensions(width,height);
      if(body[8]!==8||![2,6].includes(body[9])||body[10]||body[11]||body[12]) throw Error('Unsupported PNG encoding');
      channels=body[9]===6?4:3;
    } else if(type==='IDAT') {
      if(dataEnded) throw Error('Nonconsecutive PNG data'); seenData=true;compressed.push(body);
    } else if(type==='IEND') {
      if(size||!seenData||end!==bytes.length) throw Error('Invalid PNG end'); ended=true;
    } else {
      if(seenData) dataEnded=true;
      // Reject palette/transparency and unknown critical chunks: never silently alter decoded pixels.
      if(type==='tRNS'||type==='PLTE'||type[0]===type[0].toUpperCase()) throw Error('Unsupported PNG chunk');
    }
    offset=end;
  }
  if(!ended) throw Error('Missing PNG end');
  const stride=width*channels, expected=(stride+1)*height;
  const raw=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected});
  if(raw.length!==expected) throw Error('Invalid PNG scanline length');
  const scan=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)]; if(filter>4) throw Error('Invalid PNG filter');
    if(filter===0){raw.copy(scan,y*stride,y*(stride+1)+1,(y+1)*(stride+1));continue;}
    for(let x=0;x<stride;x++) {
      const i=y*stride+x,a=x>=channels?scan[i-channels]:0,b=y?scan[i-stride]:0;
      const predictor=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,y&&x>=channels?scan[i-stride-channels]:0);
      scan[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  if(channels===4)return {width,height,rgba:scan};
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0;i<width*height;i++){rgba[i*4]=scan[i*3];rgba[i*4+1]=scan[i*3+1];rgba[i*4+2]=scan[i*3+2];rgba[i*4+3]=255;}
  return {width,height,rgba};
}
