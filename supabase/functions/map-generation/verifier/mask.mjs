import {crc} from './png.mjs';
// Provider-specific mask polarity: transparent selected pixels, opaque unselected.
// Runs in a fresh bounded worker, never encoded in a browser transport adapter.
export async function encodeMask(region){
 const raw=new Uint8Array((1024*4+1)*1024);
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const i=y*(4096+1)+1+x*4;raw[i]=raw[i+1]=raw[i+2]=255;raw[i+3]=x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height?0:255;}
 const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),data=new Uint8Array(await new Response(stream).arrayBuffer());
 const chunk=(type,bytes)=>{const out=new Uint8Array(bytes.length+12),v=new DataView(out.buffer);v.setUint32(0,bytes.length);out.set(new TextEncoder().encode(type),4);out.set(bytes,8);v.setUint32(out.length-4,crc(out.subarray(4,out.length-4)));return out;};
 const header=new Uint8Array(13),v=new DataView(header.buffer);v.setUint32(0,1024);v.setUint32(4,1024);header[8]=8;header[9]=6;
 const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',data),chunk('IEND',new Uint8Array())];
 const png=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){png.set(p,offset);offset+=p.length;}return png;
}
