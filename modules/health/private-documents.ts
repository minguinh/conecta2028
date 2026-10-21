import {assertHealthAccess,type HealthPrincipal,type HealthRecordScope,HealthPolicyError} from './policy';
/** R2 binding belongs exclusively to the independent health Worker, never the main app. */
export interface PrivateBucket{put(key:string,value:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;get(key:string):Promise<{body:ReadableStream<Uint8Array>}|null>;delete(key:string):Promise<unknown>}
export type DocumentMetadata={id:string;requestId:string;objectKey:string;scanStatus:'quarentena'|'disponivel'|'rejeitado'};
export type HealthAccessLog=(event:{subjectId:string;requestId:string;documentId:string;action:'document.upload'|'document.read';outcome:'allowed'|'denied'})=>Promise<void>;
export function validateDocument(bytes:Uint8Array,mime:string){if(!bytes.length||bytes.length>8*1024*1024)throw new HealthPolicyError('Envie um documento de até 8 MB.');const match=mime==='application/pdf'&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'||mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255||mime==='image/png'&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);if(!match)throw new HealthPolicyError('Documento incompatível. Use PDF, JPEG ou PNG.');}
export async function uploadPrivateDocument(bucket:PrivateBucket,actor:HealthPrincipal,scope:HealthRecordScope,requestId:string,bytes:Uint8Array,mime:string,log:HealthAccessLog){
 const id=crypto.randomUUID();try{assertHealthAccess(actor,'document.write',scope);validateDocument(bytes,mime);}catch(e){await log({subjectId:actor.subjectId,requestId,documentId:id,action:'document.upload',outcome:'denied'});throw e;}
 // Random object keys contain neither names nor government/official identifiers.
 const objectKey='quarantine/'+id;await log({subjectId:actor.subjectId,requestId,documentId:id,action:'document.upload',outcome:'allowed'});await bucket.put(objectKey,bytes,{httpMetadata:{contentType:'application/octet-stream'}});return {id,requestId,objectKey,scanStatus:'quarentena' as const};
}
export async function readPrivateDocument(bucket:PrivateBucket,actor:HealthPrincipal,scope:HealthRecordScope,document:DocumentMetadata,log:HealthAccessLog){
 try{assertHealthAccess(actor,'document.read',scope);if(document.scanStatus!=='disponivel')throw new HealthPolicyError('Documento aguardando verificação de segurança.');}catch(e){await log({subjectId:actor.subjectId,requestId:document.requestId,documentId:document.id,action:'document.read',outcome:'denied'});throw e;}
 // Fail closed if durable access logging is unavailable. No public or presigned URLs.
 await log({subjectId:actor.subjectId,requestId:document.requestId,documentId:document.id,action:'document.read',outcome:'allowed'});const object=await bucket.get(document.objectKey);if(!object)throw new HealthPolicyError('Documento indisponível.');return new Response(object.body,{headers:{'Cache-Control':'private, no-store','Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="documento"','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
