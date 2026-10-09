import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';import {digest} from './decoder.mjs';
const browser=process.argv[2];if(!browser)throw Error('Explicit reviewed browser-prototype directory required');
const dir=new URL('./fixtures/',import.meta.url);await mkdir(dir,{recursive:true});const records=JSON.parse(await readFile(new URL('./provenance.json',import.meta.url)));
for(const id of Object.keys(records))for(const kind of ['source','candidate','output']){
 const input=kind==='output'?new URL('browser-'+id+'-output.png','file://'+browser.replace(/\/$/,'')+'/'):new URL('../magick/fixtures/'+id+'-'+kind+'.png',import.meta.url);
 const bytes=await readFile(input),record=records[id].files[kind];if(bytes.length!==record.bytes||await digest(bytes)!==record.sha256)throw Error('Provenance mismatch '+id+' '+kind);await copyFile(input,new URL(id+'-'+kind+'.png',dir));
}await writeFile(new URL('manifest.json',dir),JSON.stringify(records,null,2)+'\n');
