import { getAuth } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { body,failure,json,sameOrigin } from '@/lib/http';
export const runtime='nodejs';
async function handler(request:Request){
 if(!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL)return Response.json({message:'Autenticação ainda não configurada.'},{status:503});
 try{
  const path=new URL(request.url).pathname.replace('/api/auth','');
  if(request.method==='GET'&&path!=='/get-session')return json({message:'Rota indisponível.'},404);
  if(request.method==='POST'){
   if(!['/sign-in/email','/sign-out','/change-password'].includes(path))return json({message:'Cadastro público e alteração de perfil por esta rota estão desabilitados.'},403);
   sameOrigin(request);
   const input=await body(request);
   if(path==='/change-password')input.revokeOtherSessions=true;
   request=new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(input)});
  }
  const response=await getAuth().handler(request);
  if(path==='/sign-in/email'&&!response.ok)await audit('auth.login.failed',null,null,'denied');
  return response;
 }catch(error){return failure(error);}
}
export const GET=handler;
export const POST=handler;
