import {encodePng} from './png.mjs';
export const journeys=Object.freeze([
 {id:'curved-shrine',kind:'generate',prompt:'Top-down orthographic fantasy battle map, curved sea shrine with a circular sanctuary, crescent outer wall, two arched approaches, central stone altar. No grid, text, perspective, labels or tokens. Canvas 1024 by 1024.'},
 {id:'sea-cave',kind:'reference',prompt:'Turn this top-down layout sketch into an illustrated sea cave battle map. Preserve the ring cavern and southern entry. Wet rock, shallow blue water, grim nautical fantasy. No grid, text, perspective, labels or tokens. Canvas 1024 by 1024.'},
 {id:'added-chamber',kind:'revise',prompt:'Add a small dry hidden chamber and a narrow doorway inside the transparent selected upper-right rectangle of this sea cave. Maintain top-down view and existing map style. Keep everything else unchanged. No text, grid or tokens. Do not enlarge canvas.',region:{x:650,y:160,width:220,height:240}},
]);
export function sketch() {
 const width=1024,height=1024,rgba=Buffer.alloc(width*height*4,255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
  const radius=Math.hypot(x-512,y-430),wall=Math.abs(radius-280)<14,entry=Math.abs(x-512)<55&&y>670&&y<970;
  const shade=wall&&!entry?35:radius<280||entry?210:255, i=(y*width+x)*4;
  rgba[i]=shade;rgba[i+1]=shade;rgba[i+2]=shade;
 }
 return encodePng({width,height,rgba});
}
