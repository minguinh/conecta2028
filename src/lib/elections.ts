import 'server-only';
import {sql,eq} from 'drizzle-orm';
import {getDb} from '@/db/client';
import {transaction} from '@/db/write';
import {electionImports,electionResults,electionPlaces,auditLogs} from '@/db/schema';
import type {Actor} from './authorization';
import {HttpError} from './http';
import {officialSource,parseElectionCsv,parseElectionPoints} from './election-input';
export async function importElection(actor:Actor,input:Record<string,unknown>){
 if(Object.keys(input).some(k=>!['kind','sourceUrl','csv','geojson'].includes(k)))throw new HttpError(400,'Campos não reconhecidos.');
 const sourceUrl=officialSource(input.sourceUrl);const kind=input.kind;if(kind!=='results'&&kind!=='places')throw new HttpError(400,'Tipo de importação inválido.');
 const rows=kind==='results'?parseElectionCsv(typeof input.csv==='string'?input.csv:''):parseElectionPoints(input.geojson);
 const bytes=new TextEncoder().encode(JSON.stringify({kind,rows}));const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 return transaction(actor.id,async tx=>{
  // Serialize imports and recheck live authorization inside the same transaction.
  await tx.execute(sql`select pg_advisory_xact_lock(2028,31)`);
  const active=await tx.execute(sql`select u.id from "user" u join roles r on r.code=u.role join role_permissions rp on rp.role_code=u.role where u.id=${actor.id} and u.active and r.enabled and u.role='administrador_geral' and rp.permission_code='users.manage' for share of u,r,rp`);if(!active.rows.length)throw new HttpError(403,'Importação restrita ao administrador ativo.');
  const [existing]=await tx.select({id:electionImports.id}).from(electionImports).where(eq(electionImports.checksum,checksum));if(existing)return {id:existing.id,count:rows.length,duplicate:true};
  const [batch]=await tx.insert(electionImports).values({kind,sourceUrl,checksum,rowCount:rows.length}).returning({id:electionImports.id});
  if(kind==='results'){
   const results=rows as ReturnType<typeof parseElectionCsv>;const sectionPlaces=new Map<string,string>();for(const r of results){const key=[r.year,r.election,r.turn,r.uf,r.municipality,r.zone,r.section].join(':');if(sectionPlaces.has(key)&&sectionPlaces.get(key)!==r.place)throw new HttpError(400,'Uma seção não pode pertencer a dois locais na mesma eleição.');sectionPlaces.set(key,r.place);}
   // Chunked inserts remain atomic; updates replace an official aggregate, never add it twice.
   for(let offset=0;offset<results.length;offset+=100){const chunk=results.slice(offset,offset+100);const conflict=await tx.execute(sql`select 1 from election_results r join jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb) as v(year int,election text,turn int,uf text,municipality text,zone int,section int,place text) on r.year=v.year and r.election=v.election and r.turn=v.turn and r.uf=v.uf and r.municipality=v.municipality and r.zone=v.zone and r.section=v.section where r.place<>v.place limit 1`);if(conflict.rows.length)throw new HttpError(409,'Local de seção divergente do histórico importado. Revise a origem antes de importar.');
    await tx.insert(electionResults).values(chunk.map(r=>({...r,importId:batch.id}))).onConflictDoUpdate({target:[electionResults.year,electionResults.election,electionResults.turn,electionResults.uf,electionResults.municipality,electionResults.zone,electionResults.section,electionResults.office,electionResults.option],set:{votes:sql`excluded.votes`,optionName:sql`excluded.option_name`,officeName:sql`excluded.office_name`,municipalityName:sql`excluded.municipality_name`,placeName:sql`excluded.place_name`,importId:batch.id}});
   }
   }else{
   const points=rows as ReturnType<typeof parseElectionPoints>;
   const absent=await tx.execute(sql`select 1 from jsonb_to_recordset(${JSON.stringify(points)}::jsonb) as p(year int,uf text,municipality text,zone int,place text) where not exists(select 1 from election_results r where r.year=p.year and r.uf=p.uf and r.municipality=p.municipality and r.zone=p.zone and r.place=p.place) limit 1`);
   if(absent.rows.length)throw new HttpError(400,'Importe primeiro os resultados de todos os locais informados.');
   for(let offset=0;offset<points.length;offset+=100)await tx.insert(electionPlaces).values(points.slice(offset,offset+100).map(p=>({...p,importId:batch.id}))).onConflictDoUpdate({target:[electionPlaces.year,electionPlaces.uf,electionPlaces.municipality,electionPlaces.zone,electionPlaces.place],set:{latitude:sql`excluded.latitude`,longitude:sql`excluded.longitude`,importId:batch.id}});
  }
  await tx.insert(auditLogs).values({actorId:actor.id,action:'elections.import',metadata:{importId:batch.id,kind,count:rows.length,checksum}});return {id:batch.id,count:rows.length,duplicate:false};
 });
}
export async function electionData(params:URLSearchParams){
 const db=getDb();const catalog=await db.execute(sql`select distinct year,election,turn,office,office_name,uf,municipality,municipality_name from election_results order by year desc,election,turn,office,uf,municipality limit 1000`);
 const selected=catalog.rows.find(r=>[r.year,r.election,r.turn,r.office,r.uf,r.municipality].join(':')===params.get('selection'))||catalog.rows[0];
 const imports=await db.select({id:electionImports.id,kind:electionImports.kind,sourceUrl:electionImports.sourceUrl,rowCount:electionImports.rowCount,createdAt:electionImports.createdAt}).from(electionImports).orderBy(sql`${electionImports.createdAt} desc`).limit(10);
 if(!selected)return {catalog:[],selected:null,totals:[],places:[],history:[],imports};
 const s=selected;const scope=sql`r.year=${s.year} and r.election=${s.election} and r.turn=${s.turn} and r.office=${s.office} and r.uf=${s.uf} and r.municipality=${s.municipality}`;
 const [totals,places,history]=await Promise.all([
 db.execute(sql`select r.option,r.option_name,sum(r.votes)::float8 votes,count(*)::int sections from election_results r where ${scope} group by r.option,r.option_name order by sum(r.votes) desc,r.option limit 500`),
 db.execute(sql`select r.zone,r.place,min(r.place_name) name,count(distinct r.section)::int sections,sum(r.votes)::float8 votes,p.latitude,p.longitude from election_results r left join election_places p on p.year=r.year and p.uf=r.uf and p.municipality=r.municipality and p.zone=r.zone and p.place=r.place where ${scope} group by r.zone,r.place,p.latitude,p.longitude order by r.zone,r.place limit 1000`),
 db.execute(sql`select r.year,r.election,r.turn,count(distinct (r.zone,r.section))::int sections,count(distinct (r.zone,r.place))::int places,sum(r.votes)::float8 votes from election_results r where r.office=${s.office} and r.uf=${s.uf} and r.municipality=${s.municipality} and r.turn=${s.turn} group by r.year,r.election,r.turn order by r.year,r.election limit 100`)
 ]);return {catalog:catalog.rows,selected,totals:totals.rows,places:places.rows,history:history.rows,imports};
}
