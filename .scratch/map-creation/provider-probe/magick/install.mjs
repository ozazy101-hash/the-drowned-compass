import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const dir=new URL('./deps/',import.meta.url);await mkdir(dir,{recursive:true});
const url='https://registry.npmjs.org/@imagemagick/magick-wasm/-/magick-wasm-0.0.44.tgz';
const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Package download failed');
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==11250922||createHash('sha512').update(bytes).digest('base64')!=='J6oieSjlJzamANwtrNAlO+DKnRm49ILtSIWDhtkGn35f/5zS99AXta2gPsZuG9m2JvQbsu3h3CHe14ViXrFD/Q==')throw Error('Pinned package integrity mismatch');
const file=new URL('imagemagick-magick-wasm-0.0.44.tgz',dir);await writeFile(file,bytes);execFileSync('tar',['-xzf',file.pathname,'-C',dir.pathname]);
console.log('Installed verified @imagemagick/magick-wasm 0.0.44 in probe-only deps; no scripts executed.');
