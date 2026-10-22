import {auth,activate,requireHealthActor} from './auth';
import {reply,readJson,sameOrigin,uuid,ServiceError,type HealthEnv,type HealthActor} from './types';
import {HealthPolicyError} from '../policy';
import {examGroups,specialties} from '../registration';
import {listPatients,savePatient,patientRecord,updatePatient,newPatientRequest,updateStatus,revoke,policyVersion} from './records';
import {preview,upload} from './documents';
import {cleanup} from './cleanup';
import {logDenied} from './db';
export default {
 async fetch(request:Request,env:HealthEnv):Promise<Response>{const url=new URL(request.url),path=url.pathname;let verified:HealthActor|undefined;try{
  if(path==='/BUILD_ID')return env.ASSETS.fetch(request);
  if(path.startsWith('/api/')){
   if(!env.HEALTH_DATABASE_URL||!env.HEALTH_AUTH_SECRET||!env.HEALTH_DATA_KEY||!env.HEALTH_POLICY_APPROVED_AT||env.HEALTH_ENABLED!=='true')throw new ServiceError(503,'Ambiente assistencial aguardando configuração.');
   if(!['GET','HEAD'].includes(request.method))sameOrigin(request,env);
   if(path.startsWith('/api/auth/')){if(!['/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/get-session'].includes(path))throw new ServiceError(404,'Operação indisponível.');return auth(env).handler(request);}
   if(path==='/api/activate'&&request.method==='POST')return reply(await activate(env,await readJson(request)));
   const actor=await requireHealthActor(request,env);verified=actor;
   if(path==='/api/me'&&request.method==='GET')return reply({actor:{id:actor.subjectId,name:actor.name,role:actor.role},catalog:{examGroups,specialties},policy:{version:policyVersion,retentionYears:6,approvedAt:env.HEALTH_POLICY_APPROVED_AT,documents:'Visualização por cópias PNG sanitizadas. Originais criptografados sem acesso direto.'}});
   if(path==='/api/patients'&&request.method==='GET')return reply(await listPatients(env,actor,url.searchParams));
   if(path==='/api/patients'&&request.method==='POST')return reply(await savePatient(env,actor,await readJson(request)),201);
   let match=path.match(/^\/api\/patients\/([^/]+)$/);if(match){const id=uuid(match[1]);if(request.method==='GET')return reply(await patientRecord(env,actor,id));if(request.method==='PATCH')return reply(await updatePatient(env,actor,id,await readJson(request)));}
   match=path.match(/^\/api\/patients\/([^/]+)\/requests$/);if(match&&request.method==='POST')return reply(await newPatientRequest(env,actor,uuid(match[1]),await readJson(request)),201);
   match=path.match(/^\/api\/requests\/([^/]+)\/status$/);if(match&&request.method==='PATCH')return reply(await updateStatus(env,actor,uuid(match[1]),await readJson(request)));
   match=path.match(/^\/api\/requests\/([^/]+)\/revoke$/);if(match&&request.method==='POST')return reply(await revoke(env,actor,uuid(match[1])));
   match=path.match(/^\/api\/requests\/([^/]+)\/documents$/);if(match&&request.method==='POST')return reply(await upload(env,actor,uuid(match[1]),request),201);
   match=path.match(/^\/api\/documents\/([^/]+)\/pages\/(\d+)$/);if(match&&request.method==='GET')return await preview(env,actor,uuid(match[1]),Number(match[2]));
   throw new ServiceError(404,'Operação não encontrada.');
  }
  const asset=await env.ASSETS.fetch(request);const response=asset.status===404&&!path.includes('.')?await env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request)):asset;const headers=new Headers(response.headers);headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");headers.set('Referrer-Policy','no-referrer');headers.set('X-Content-Type-Options','nosniff');if(response.headers.get('content-type')?.includes('text/html'))headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers});
 }catch(e){if(verified&&(e instanceof HealthPolicyError||e instanceof ServiceError&&[403,404].includes(e.status))){try{await logDenied(env,verified);}catch{console.error('HEALTH_DENIAL_AUDIT_FAILED');}}if(e instanceof ServiceError)return reply({message:e.message},e.status);if(e instanceof HealthPolicyError)return reply({message:e.message},400);const code=(e as {code?:string})?.code||((e as {cause?:{code?:string}})?.cause?.code);if(code==='23505')return reply({message:'Identificador já cadastrado. Solicite revisão à supervisão de saúde.'},409);if(code==='P0001')return reply({message:'A operação exige revisão de autorização, versão ou política.'},409);const id=crypto.randomUUID();console.error('HEALTH_REQUEST_FAILED',id,{name:(e as Error)?.name,code,location:(e as Error)?.stack?.split('\n').slice(1,3).map(s=>s.replace(/https?:\/\/\S+/g,'[redacted]'))});return reply({message:'Não foi possível concluir. Tente novamente.',requestId:id},503);}},
 async scheduled(_event:unknown,env:HealthEnv,context:{waitUntil(p:Promise<unknown>):void}){context.waitUntil(cleanup(env).catch(()=>console.error('HEALTH_RETENTION_FAILED')));}
};
