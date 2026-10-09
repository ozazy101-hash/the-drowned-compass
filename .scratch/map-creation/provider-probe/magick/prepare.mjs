import {writeFile,copyFile,mkdir} from 'node:fs/promises';
import {encodePng} from '../png.mjs';
const dir=new URL('./fixtures/',import.meta.url);
await mkdir(dir,{recursive:true});
for(const [target,source] of [['source','live-source'],['candidate','live-candidate']])await copyFile(new URL('../lambda/corpus/'+source+'.png',import.meta.url),new URL('live-'+target+'.png',dir));
for(const mode of ['transparent','lowalpha','noise'])for(const kind of ['source','candidate']){
 const rgba=new Uint8Array(1024*1024*4);let seed=kind==='source'?1234:5678;
 for(let i=0;i<rgba.length;i+=4){for(let c=0;c<3;c++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;rgba[i+c]=seed&255;}rgba[i+3]=mode==='transparent'?0:mode==='lowalpha'?[1,127,254][(i/4)%3]:255;}
 await writeFile(new URL(mode+'-'+kind+'.png',dir),encodePng({width:1024,height:1024,rgba}));
}
