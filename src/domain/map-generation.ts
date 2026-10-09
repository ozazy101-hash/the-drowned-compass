import type {GridMapDocument} from './grid-map';
export type MapGenerationIntent={requestId:string;familyId:string;parentVersionId?:string;expectedVersion:number;kind:'generate'|'reference'|'revise';title:string;instructions:string;document?:GridMapDocument;source?:'artwork'|'reference';region?:{x:number;y:number;width:number;height:number}};
export type MapGenerationJob=Readonly<{id:string;familyId:string;parentVersionId:string|null;state:'queued'|'running'|'uncertain'|'awaiting-client-output'|'completed'|'failed'|'cancelled';revision:number;mode:'live'|'fixture';createdAt:string;code:string|null;versionId:string|null;assembly?:{region:{x:number;y:number;width:number;height:number};pixelWidth:1024;pixelHeight:1024;requiresSource:boolean}}>;
export type MapGenerationResult={ok:true;job:MapGenerationJob}|{ok:false;code:string};
export type MapGenerationCommand={kind:'submit';intent:MapGenerationIntent}|{kind:'read'|'cancel';requestId:string}|{kind:'output';requestId:string;file:Blob};
export type MapGenerationInput={job:MapGenerationJob;candidate:Blob;source:Blob|null};
