import { randomUUID } from 'node:crypto';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});}
export function failure(error:unknown){if(error instanceof HttpError)return json({message:error.message},error.status);const id=randomUUID();console.error('Request failed',id);return json({message:'Não foi possível concluir a operação.',requestId:id},503);}
export function sameOrigin(request:Request){const configured=process.env.BETTER_AUTH_URL;if(!configured||request.headers.get('origin')!==new URL(configured).origin)throw new HttpError(403,'Origem não autorizada.');if((request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json')throw new HttpError(415,'Envie os dados em JSON.');}
/** Limit bytes while streaming, including requests without Content-Length. */
export async function readJsonBody(request:Pick<Request,'headers'|'body'>,limit=8192):Promise<Record<string,unknown>>{
 if(Number(request.headers.get('content-length'))>limit)throw new HttpError(413,'Solicitação muito grande.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Envie os dados em JSON.');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'Solicitação muito grande.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw 0;return value;}catch{throw new HttpError(400,'Dados inválidos.');}
}
export const body=(request:Request)=>readJsonBody(request);
export function string(value:unknown,name:string,max=120){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new HttpError(400,`${name} inválido.`);return value.trim();}
export function email(value:unknown){const v=string(value,'E-mail',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new HttpError(400,'E-mail inválido.');return v;}
export function password(value:unknown){if(typeof value!=='string'||value.length<12||value.length>128)throw new HttpError(400,'A senha deve ter entre 12 e 128 caracteres.');return value;}
