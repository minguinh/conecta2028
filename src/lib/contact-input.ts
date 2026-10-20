import { HttpError, string } from './http';
import { legalBases,type LegalBasis } from './contact-types';
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizePhone(value:unknown){const raw=string(value,'Telefone',30);if(!/^[+\d\s().-]+$/.test(raw))throw new HttpError(400,'Telefone inválido.');let digits=raw.replace(/\D/g,'');if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);if(!/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(digits))throw new HttpError(400,'Informe telefone brasileiro com DDD.');return `55${digits}`;}
const optional=(v:unknown,label:string,max:number)=>v===undefined||v===null||v===''?null:string(v,label,max);
export function parseContact(input:Record<string,unknown>,editing=false){
 const allowed=['name','phone','communityId','address','notes','legalBasis','purpose','legalEvidence','allowWhatsapp','allowSms','allowCalls','communicationEvidence','version'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw new HttpError(400,'O cadastro aceita apenas os campos administrativos previstos.');
 const name=string(input.name,'Nome',150),phone=normalizePhone(input.phone),communityId=string(input.communityId,'Localidade',36);
 if(!uuidPattern.test(communityId))throw new HttpError(400,'Localidade inválida.');
 if(typeof input.legalBasis!=='string'||!Object.hasOwn(legalBases,input.legalBasis))throw new HttpError(400,'Informe a base legal aplicável.');
 for(const k of ['allowWhatsapp','allowSms','allowCalls'])if(typeof input[k]!=='boolean')throw new HttpError(400,'Informe as autorizações de comunicação.');
 const communicationEvidence=optional(input.communicationEvidence,'Registro da autorização de comunicação',1000);
 if((input.allowWhatsapp||input.allowSms||input.allowCalls)&&!communicationEvidence)throw new HttpError(400,'Registre como e quando a pessoa autorizou os canais selecionados.');
 if(editing&&(!Number.isInteger(input.version)||Number(input.version)<1))throw new HttpError(400,'Recarregue o contato antes de editar.');
 return {name,phone,communityId,address:optional(input.address,'Endereço',500),notes:optional(input.notes,'Observações administrativas',1500),legalBasis:input.legalBasis as LegalBasis,purpose:string(input.purpose,'Finalidade do tratamento',500),legalEvidence:string(input.legalEvidence,'Registro da base legal',1000),allowWhatsapp:input.allowWhatsapp as boolean,allowSms:input.allowSms as boolean,allowCalls:input.allowCalls as boolean,communicationEvidence,version:editing?Number(input.version):1};
}
