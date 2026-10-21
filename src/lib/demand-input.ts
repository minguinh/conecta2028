import {HttpError,string} from './http';
import {agendaUuid} from './agenda-input';
import {demandCategories,demandStatuses,demandPriorities,demandClosed,type DemandStatus,type DemandPriority} from './demand-types';
function optional(value:unknown,label:string,max:number){if(value===undefined||value===null||value==='')return null;return string(value,label,max);}
export function demandDate(value:unknown){if(value===undefined||value===null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new HttpError(400,'Prazo inválido.');const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value||d.getUTCFullYear()<2000||d.getUTCFullYear()>2100)throw new HttpError(400,'Prazo inválido.');return value;}
export function parseDemand(input:Record<string,unknown>,editing=false){
 if(Object.keys(input).some(k=>!['title','description','category','status','priority','communityId','assignedTo','dueDate','resolution','version'].includes(k)))throw new HttpError(400,'Campos de demanda inválidos.');
 const title=string(input.title,'Título',180),description=optional(input.description,'Descrição',3000);
 if(typeof input.category!=='string'||!(demandCategories as readonly string[]).includes(input.category))throw new HttpError(400,'Categoria inválida.');
 if(typeof input.status!=='string'||!Object.hasOwn(demandStatuses,input.status)||!editing&&input.status!=='em_andamento')throw new HttpError(400,'Status inválido. Novas demandas começam em andamento.');
 if(typeof input.priority!=='string'||!Object.hasOwn(demandPriorities,input.priority))throw new HttpError(400,'Prioridade inválida.');
 const assignedTo=string(input.assignedTo,'Responsável',128),communityId=optional(input.communityId,'Localidade',36);if(communityId&&!agendaUuid.test(communityId))throw new HttpError(400,'Localidade inválida.');
 const resolution=optional(input.resolution,'Registro de encerramento',2000),status=input.status as DemandStatus;
 if(demandClosed(status)&&!resolution)throw new HttpError(400,'Informe a solução ou o motivo do cancelamento.');
 if(editing&&(!Number.isInteger(input.version)||Number(input.version)<1))throw new HttpError(400,'Recarregue a demanda antes de salvar.');
 return {title,description,category:input.category,status,priority:input.priority as DemandPriority,assignedTo,communityId,dueDate:demandDate(input.dueDate),resolution:demandClosed(status)?resolution:null,version:editing?Number(input.version):1};
}
