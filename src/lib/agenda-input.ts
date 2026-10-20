import { HttpError,string } from './http';
import { eventKinds } from './agenda-types';
export const agendaUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function localInstant(value:unknown,label:string){const s=string(value,label,16);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))throw new HttpError(400,`${label} inválido.`);const utc=new Date(s+':00Z');if(!Number.isFinite(utc.getTime())||utc.toISOString().slice(0,16)!==s||utc.getUTCFullYear()<1999||utc.getUTCFullYear()>2101)throw new HttpError(400,`${label} inválido.`);return new Date(s+':00-03:00');}
export function agendaVersion(value:unknown){if(!Number.isInteger(value)||Number(value)<1)throw new HttpError(400,'Recarregue o compromisso antes de salvar.');return Number(value);}
export function parseAgenda(input:Record<string,unknown>,editing=false){if(Object.keys(input).some(k=>!['title','description','kind','scheduledAt','endsAt','assignedTo','communityId','version'].includes(k)))throw new HttpError(400,'Campos de compromisso inválidos.');const title=string(input.title,'Título',180),description=input.description?string(input.description,'Descrição administrativa',2000):null;
 if(typeof input.kind!=='string'||!Object.hasOwn(eventKinds,input.kind))throw new HttpError(400,'Tipo de compromisso inválido.');
 const start=localInstant(input.scheduledAt,'Início'),end=localInstant(input.endsAt,'Término');if(end<=start||end.getTime()-start.getTime()>7*86400000)throw new HttpError(400,'O término deve ser posterior ao início, com duração máxima de sete dias.');
 const assignedTo=string(input.assignedTo,'Responsável',128);const communityId=input.communityId?string(input.communityId,'Localidade',36):null;if(communityId&&!agendaUuid.test(communityId))throw new HttpError(400,'Localidade inválida.');
 return {title,description,kind:input.kind as keyof typeof eventKinds,start,end,assignedTo,communityId,version:editing?agendaVersion(input.version):1};
}
export function agendaRange(params:URLSearchParams){const from=params.get('from'),to=params.get('to');if(!from||!to)throw new HttpError(400,'Informe o período do calendário.');const start=localInstant(from+'T00:00','Data inicial'),end=localInstant(to+'T00:00','Data final');if(end<=start||end.getTime()-start.getTime()>62*86400000)throw new HttpError(400,'Consulte períodos de até 62 dias.');return {start,end};}
