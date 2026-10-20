import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { transaction } from '@/db/write';
import type { Actor } from './authorization';
import { HttpError } from './http';
import { parseContact,uuidPattern } from './contact-input';
import type { ContactData } from './contact-types';
const scope=(actor:Actor)=>actor.role==='assessor'?sql`c.assigned_to=${actor.id}`:sql`true`;
export async function getContacts(actor:Actor,params:URLSearchParams):Promise<ContactData>{
 const q=(params.get('q')||'').trim().slice(0,150),locality=params.get('locality')||'',channel=params.get('channel')||'',basis=params.get('basis')||'';
 const page=Math.max(1,Math.min(100000,Number(params.get('page'))||1));if(!Number.isInteger(page)||locality&&!uuidPattern.test(locality))throw new HttpError(400,'Filtro inválido.');
 const channels:Record<string,ReturnType<typeof sql>>={whatsapp:sql`c.allow_whatsapp=true`,sms:sql`c.allow_sms=true`,calls:sql`c.allow_calls=true`,none:sql`NOT c.allow_whatsapp AND NOT c.allow_sms AND NOT c.allow_calls`};
 if(channel&&!channels[channel])throw new HttpError(400,'Canal inválido.');
 const search=q?sql`(strpos(lower(c.name),lower(${q}))>0 OR strpos(coalesce(c.phone,''),${q.replace(/[^0-9]/g,'')||'not-a-phone'})>0)`:sql`true`;
 const where=sql`${scope(actor)} AND ${search} AND ${locality?sql`c.community_id=${locality}::uuid`:sql`true`} AND ${channel?channels[channel]:sql`true`} AND ${basis?sql`coalesce(c.legal_basis,'pendente')=${basis}`:sql`true`}`;
 const r=await getDb().execute(sql`SELECT json_build_object('contacts',coalesce((SELECT json_agg(r) FROM (SELECT c.id,c.name,c.phone,c.community_id AS "communityId",l.name AS community,c.address,c.notes,c.legal_basis AS "legalBasis",c.purpose,c.legal_evidence AS "legalEvidence",c.allow_whatsapp AS "allowWhatsapp",c.allow_sms AS "allowSms",c.allow_calls AS "allowCalls",c.communication_evidence AS "communicationEvidence",c.authorization_at AS "authorizationAt",c.assigned_to AS "assignedTo",c.version,c.updated_at AS "updatedAt" FROM contacts c LEFT JOIN communities l ON l.id=c.community_id WHERE ${where} ORDER BY c.name,c.id LIMIT 25 OFFSET ${(page-1)*25})r),'[]'::json),'total',(SELECT count(*)::int FROM contacts c WHERE ${where}),'page',${page}::int,'localities',coalesce((SELECT json_agg(l) FROM (SELECT id,name FROM communities ORDER BY name,id LIMIT 2000)l),'[]'::json)) AS data`);
 return r.rows[0].data as ContactData;
}
export async function saveContact(actor:Actor,input:Record<string,unknown>,id?:string){
 const d=parseContact(input,!!id);if(id&&!uuidPattern.test(id))throw new HttpError(400,'Contato inválido.');
 try{return await transaction(actor.id,async tx=>{
 const role=await tx.execute(sql`SELECT role FROM "user" WHERE id=${actor.id} AND active=true AND role IN ('administrador_geral','coordenador','assessor') FOR SHARE`);if(!role.rows.length)throw new HttpError(403,'Você não pode editar contatos.');
 const locality=await tx.execute(sql`SELECT id FROM communities WHERE id=${d.communityId}::uuid FOR SHARE`);if(!locality.rows.length)throw new HttpError(400,'Selecione uma localidade cadastrada.');
 if(id){const own=role.rows[0].role==='assessor'?sql`assigned_to=${actor.id}`:sql`true`;const r=await tx.execute(sql`UPDATE contacts SET name=${d.name},phone=${d.phone},community_id=${d.communityId}::uuid,address=${d.address},notes=${d.notes},legal_basis=${d.legalBasis},purpose=${d.purpose},legal_evidence=${d.legalEvidence},allow_whatsapp=${d.allowWhatsapp},allow_sms=${d.allowSms},allow_calls=${d.allowCalls},communication_evidence=${d.communicationEvidence},authorization_at=CASE WHEN ROW(allow_whatsapp,allow_sms,allow_calls,communication_evidence) IS DISTINCT FROM ROW(${d.allowWhatsapp},${d.allowSms},${d.allowCalls},${d.communicationEvidence}::text) THEN now() ELSE authorization_at END,updated_at=now(),version=version+1 WHERE id=${id}::uuid AND version=${d.version} AND ${own} RETURNING id`);if(!r.rows.length)throw new HttpError(409,'Contato indisponível, alterado ou fora da sua responsabilidade. Recarregue a lista.');return r.rows[0];}
 const r=await tx.execute(sql`INSERT INTO contacts(name,phone,community_id,address,notes,legal_basis,purpose,legal_evidence,allow_whatsapp,allow_sms,allow_calls,communication_evidence,authorization_at,assigned_to) VALUES (${d.name},${d.phone},${d.communityId}::uuid,${d.address},${d.notes},${d.legalBasis},${d.purpose},${d.legalEvidence},${d.allowWhatsapp},${d.allowSms},${d.allowCalls},${d.communicationEvidence},now(),${actor.id}) RETURNING id`);return r.rows[0];
 });}catch(e){let current:unknown=e;for(let i=0;i<5&&current&&typeof current==='object';i++){if('code' in current&&current.code==='23505')throw new HttpError(409,'Já existe um contato com esse telefone. Consulte a equipe responsável para evitar duplicidade.');current='cause' in current?current.cause:null;}throw e;}
}
export async function contactHistory(actor:Actor,id:string){if(!uuidPattern.test(id))throw new HttpError(400,'Contato inválido.');const r=await getDb().execute(sql`SELECT a.id,a.action,a.created_at AS "createdAt",a.metadata,u.name AS actor FROM audit_logs a LEFT JOIN "user" u ON u.id=a.actor_id WHERE a.metadata->>'recordId'=${id} AND a.action LIKE 'contacts.%' AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=${id}::uuid AND ${scope(actor)}) ORDER BY a.created_at DESC,a.id DESC LIMIT 100`);return r.rows;}
