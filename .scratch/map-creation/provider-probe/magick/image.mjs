import {ImageMagick,initializeImageMagick,MagickFormat,MagickGeometry,CompositeOperator,Point,ColorType} from './deps/package/dist/index.js';
let initialized;
export async function initialize(bytes) {initialized??=initializeImageMagick(bytes);await initialized;}
export function validate(bytes) {
 if(bytes.length>20*1024*1024||bytes.length<33)throw Error('Invalid PNG byte bound');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if([...bytes.subarray(0,8)].join(',')!=='137,80,78,71,13,10,26,10')throw Error('Invalid PNG signature');
 if(view.getUint32(16)!==1024||view.getUint32(20)!==1024)throw Error('Only 1024 square admitted');
 let end=false;
 for(let offset=8;offset<bytes.length;){
  if(offset+12>bytes.length)throw Error('Truncated chunk');
  const size=view.getUint32(offset),type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
  if(offset+size+12>bytes.length)throw Error('Truncated chunk');
  if(['acTL','fcTL','fdAT'].includes(type))throw Error('Animated PNG rejected');
  offset+=size+12;if(type==='IEND'){if(offset!==bytes.length)throw Error('Trailing data');end=true;break;}
 }if(!end)throw Error('Missing IEND');
}
export function compose(source,candidate,region) {
 validate(source);validate(candidate);
 if(!region||!['x','y','width','height'].every(k=>Number.isInteger(region[k]))||region.x<0||region.y<0||region.width<1||region.height<1||region.x+region.width>1024||region.y+region.height>1024)throw Error('Invalid region');
 return ImageMagick.read(source,MagickFormat.Png,base=>ImageMagick.read(candidate,MagickFormat.Png,overlay=>{
  if(base.width!==1024||base.height!==1024||overlay.width!==1024||overlay.height!==1024)throw Error('Decoded dimensions mismatch');
  overlay.crop(new MagickGeometry(region.x,region.y,region.width,region.height));overlay.resetPage();
  base.setArtifact('compose:outside-overlay',false);
  base.composite(overlay,CompositeOperator.Copy,new Point(region.x,region.y));
  base.depth=8;base.colorType=ColorType.TrueColorAlpha;
  base.settings.setDefine(MagickFormat.Png,'color-type',6);
  base.settings.setDefine(MagickFormat.Png,'bit-depth',8);
  base.settings.setDefine(MagickFormat.Png,'compression-level',0);
  return base.write(MagickFormat.Png,data=>new Uint8Array(data));
 }));
}
