import { requireActor } from '@/lib/authorization';
import { failure } from '@/lib/http';
import { loadDashboard } from '@/lib/dashboard';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL)return Response.json({status:'unconfigured',message:'Configure o Neon e a autenticação para consultar os indicadores.'},{status:503,headers});
 try{const actor=await requireActor(request.headers,'dashboard.read');const state=await loadDashboard(actor);return Response.json(state,{status:state.status==='ready'?200:503,headers});
 }catch(error){return failure(error);}
}
