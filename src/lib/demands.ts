import 'server-only';
import {sql} from 'drizzle-orm';
import {getDb} from '@/db/client';
import {transaction,type Transaction} from '@/db/write';
import type {Actor} from './authorization';
import {HttpError} from './http';
import {parseDemand} from './demand-input';
import {agendaUuid} from './agenda-input';
import {demandCategories,demandStatuses,demandPriorities,type DemandData,type DemandHistory} from './demand-types';
const scope=(actor:Actor)=>actor.role==='assessor'?sql`d.assigned_to=${actor.id}`:sql`true`;
export async function getDemands(actor:Actor,params:URLSearchParams):Promise<DemandData>{
 const q=(params.get('q')||'').trim().slice(0,180),status=params.get('status')||'',category=params.get('category')||'',priority=params.get('priority')||'',locality=params.get('locality')||'',assigned=params.get('assigned')||'',page=Number(params.get('page')||1);
 if(!Number.isInteger(page)||page<1||page>100000||status&&!Object.hasOwn(demandStatuses,status)||category&&!(demandCategories as readonly string[]).includes(category)||priority&&!Object.hasOwn(demandPriorities,priority)||locality&&!agendaUuid.test(locality)||assigned.length>128)throw new HttpError(400,'Filtro de demandas inválido.');
 const where=sql`${scope(actor)} AND ${q?sql`strpos(lower(d.title),lower(${q}))>0`:sql`true`} AND ${status?sql`d.status=${status}`:sql`true`} AND ${category?sql`d.category=${category}`:sql`true`} AND ${priority?sql`d.priority=${priority}`:sql`true`} AND ${locality?sql`d.community_id=${locality}::uuid`:sql`true`} AND ${assigned?sql`d.assigned_to=${assigned}`:sql`true`}`;
 const r=await getDb().execute(sql`SELECT json_build_object(
 'demands',coalesce((SELECT json_agg(r) FROM (SELECT d.id,d.title,d.description,d.category,d.status,d.priority,d.community_id AS "communityId",c.name AS community,d.assigned_to AS "assignedTo",u.name AS responsible,d.due_date::text AS "dueDate",d.resolution,d.closed_at AS "closedAt",d.version,d.created_at AS "createdAt",d.updated_at AS "updatedAt" FROM demands d LEFT JOIN communities c ON c.id=d.community_id LEFT JOIN "user" u ON u.id=d.assigned_to WHERE ${where} ORDER BY d.created_at DESC,d.id DESC LIMIT 25 OFFSET ${(page-1)*25})r),'[]'::json),
 'total',(SELECT count(*)::int FROM demands d WHERE ${where}),'page',${page}::int,
 'counts',(SELECT json_build_object('em_andamento',count(*) FILTER(WHERE d.status='em_andamento'),'aguardando_retorno',count(*) FILTER(WHERE d.status='aguardando_retorno'),'concluida',count(*) FILTER(WHERE d.status='concluida'),'cancelada',count(*) FILTER(WHERE d.status='cancelada')) FROM demands d WHERE ${scope(actor)}),
 'localities',coalesce((SELECT json_agg(c) FROM (SELECT id,name FROM communities ORDER BY name,id LIMIT 2000)c),'[]'::json),
 'responsibles',coalesce((SELECT json_agg(u) FROM (SELECT id,name FROM "user" WHERE active=true AND role IN ('administrador_geral','coordenador','assessor') AND ${actor.role==='assessor'?sql`id=${actor.id}`:sql`true`} ORDER BY name,id LIMIT 2000)u),'[]'::json)) AS data`);
 return r.rows[0].data as DemandData;
}
async function writer(tx:Transaction,actor:Actor){const r=await tx.execute(sql`SELECT u.role FROM "user" u JOIN roles r ON r.code=u.role AND r.enabled=true JOIN role_permissions p ON p.role_code=u.role AND p.permission_code='operations.write' WHERE u.id=${actor.id} AND u.active=true AND u.role IN ('administrador_geral','coordenador','assessor') FOR SHARE OF u,r,p`);if(!r.rows.length)throw new HttpError(403,'Você não pode gerenciar demandas.');return String(r.rows[0].role);}
export async function saveDemand(actor:Actor,input:Record<string,unknown>,id?:string){
 const d=parseDemand(input,!!id);if(id&&!agendaUuid.test(id))throw new HttpError(400,'Demanda inválida.');
 return transaction(actor.id,async tx=>{const role=await writer(tx,actor);if(role==='assessor'&&d.assignedTo!==actor.id)throw new HttpError(403,'Assessores só podem atribuir demandas a si mesmos.');
 const assignee=await tx.execute(sql`SELECT id FROM "user" WHERE id=${d.assignedTo} AND active=true AND role IN ('administrador_geral','coordenador','assessor') FOR SHARE`);if(!assignee.rows.length)throw new HttpError(400,'Selecione um responsável ativo da equipe operacional.');
 if(d.communityId){const c=await tx.execute(sql`SELECT id FROM communities WHERE id=${d.communityId}::uuid FOR SHARE`);if(!c.rows.length)throw new HttpError(400,'Localidade não encontrada.');}
 if(!id){const r=await tx.execute(sql`INSERT INTO demands(title,description,category,priority,assigned_to,community_id,due_date) VALUES (${d.title},${d.description},${d.category},${d.priority},${d.assignedTo},${d.communityId}::uuid,${d.dueDate}::date) RETURNING id`);return r.rows[0];}
 const own=role==='assessor'?sql`assigned_to=${actor.id}`:sql`true`;const r=await tx.execute(sql`UPDATE demands SET title=${d.title},description=${d.description},category=${d.category},status=${d.status},priority=${d.priority},assigned_to=${d.assignedTo},community_id=${d.communityId}::uuid,due_date=${d.dueDate}::date,resolution=${d.resolution},closed_at=CASE WHEN ${d.status} IN ('concluida','cancelada') THEN now() ELSE NULL END,version=version+1,updated_at=now() WHERE id=${id}::uuid AND version=${d.version} AND status IN ('em_andamento','aguardando_retorno') AND ${own} RETURNING id`);
 if(!r.rows.length)throw new HttpError(409,'Demanda alterada, encerrada ou fora da sua responsabilidade. Atualize a lista antes de continuar.');return r.rows[0];});
}
export async function demandHistory(actor:Actor,id:string):Promise<DemandHistory[]>{if(!agendaUuid.test(id))throw new HttpError(400,'Demanda inválida.');const available=await getDb().execute(sql`SELECT id FROM demands d WHERE d.id=${id}::uuid AND ${scope(actor)}`);if(!available.rows.length)throw new HttpError(404,'Demanda não encontrada.');const r=await getDb().execute(sql`SELECT a.id,a.action,a.created_at AS "createdAt",a.metadata,u.name AS actor FROM audit_logs a LEFT JOIN "user" u ON u.id=a.actor_id WHERE a.metadata->>'recordId'=${id} AND a.action LIKE 'demands.%' ORDER BY a.created_at DESC,a.id DESC LIMIT 100`);return r.rows as DemandHistory[];}
