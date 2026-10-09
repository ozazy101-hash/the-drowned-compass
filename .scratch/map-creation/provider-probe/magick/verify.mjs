import {decodePng} from '../png.mjs';
export function verify(source,candidate,output,region={x:650,y:160,width:220,height:240}) {
 const a=decodePng(source),b=decodePng(candidate),c=decodePng(output);
 if([a,b,c].some(v=>v.width!==1024||v.height!==1024))throw Error('Dimensions changed');
 let outside=0,inside=0,outsideMismatch=0,insideMismatch=0;
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
  const selected=x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height,expected=selected?b.rgba:a.rgba,offset=(y*1024+x)*4;
  let mismatch=false;for(let channel=0;channel<4;channel++)if(expected[offset+channel]!==c.rgba[offset+channel])mismatch=true;
  if(selected){inside++;if(mismatch)insideMismatch++;}else{outside++;if(mismatch)outsideMismatch++;}
 }return {outside,inside,outsideMismatch,insideMismatch,exact:outsideMismatch===0&&insideMismatch===0};
}
